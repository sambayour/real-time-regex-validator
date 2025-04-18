import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Document } from "mongoose";
import { JobsService } from "./jobs.service";
import { Job, JobStatus } from "./job.entity";
import { CreateJobDto } from "./dto/create-job.dto";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer } from "kafkajs";
import { Logger } from "@nestjs/common";

// Define the JobDocument type for testing
type JobDocument = Job & Document;

jest.mock("kafkajs");
jest.mock("redis", () => {
  return {
    createClient: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe("JobsService", () => {
  let service: JobsService;
  let jobModel: Model<Job>;
  let producer: any; // Using any to avoid Producer interface constraints
  let redis;
  let logger: Logger;

  const mockJob = {
    _id: "1",
    input: "test",
    regexPattern: "^test$",
    status: JobStatus.VALIDATING,
    result: false,
    save: jest.fn(),
  };

  const mockJobModel = {
    new: jest.fn().mockReturnValue(mockJob),
    constructor: jest.fn().mockReturnValue(mockJob),
    find: jest.fn(),
    findById: jest.fn(),
    exec: jest.fn(),
  };

  const mockProducer = {
    connect: jest.fn(),
    send: jest.fn(),
    disconnect: jest.fn(),
    sendBatch: jest.fn(), // Added missing method required by Producer interface
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    jest.spyOn(console, "error").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getModelToken(Job.name),
          useValue: mockJobModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                REDIS_URL: "redis://localhost:6379",
                KAFKA_BROKERS: "localhost:9092",
                REGEX_PATTERN: "^test$",
                PROCESSING_DELAY: 2000,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jobModel = module.get<Model<Job>>(getModelToken(Job.name));

    // Override the Kafka producer with our mock
    producer = (service as any).producer = mockProducer;
    redis = (service as any).redis;
    logger = (service as any).logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a job and send it to Kafka", async () => {
      const createJobDto: CreateJobDto = {
        input: "test",
        regexPattern: "^test$",
      };

      mockJobModel.constructor.mockReturnValueOnce({
        ...mockJob,
        save: jest.fn().mockResolvedValueOnce(mockJob),
      });

      mockProducer.send.mockResolvedValueOnce(undefined);

      const result = await service.create(createJobDto);

      expect(result).toEqual(mockJob);
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: "jobs",
        messages: [
          {
            key: "1",
            value: JSON.stringify({
              jobId: "1",
              input: "test",
              regexPattern: "^test$",
            }),
          },
        ],
      });
    });

    it("should throw error if Kafka producer send fails", async () => {
      const createJobDto: CreateJobDto = {
        input: "test",
        regexPattern: "^test$",
      };

      mockJobModel.constructor.mockReturnValueOnce({
        ...mockJob,
        save: jest.fn().mockResolvedValueOnce(mockJob),
      });

      mockProducer.send.mockRejectedValueOnce(new Error("Kafka error"));

      await expect(service.create(createJobDto)).rejects.toThrow("Kafka error");
    });
  });

  describe("findAll", () => {
    it("should return an array of jobs", async () => {
      const mockJobs = [mockJob];
      mockJobModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(mockJobs),
        }),
      });

      const result = await service.findAll();
      expect(result).toEqual(mockJobs);
    });
  });

  describe("findOne", () => {
    it("should return a job by id", async () => {
      mockJobModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockJob),
      });

      const result = await service.findOne("1");
      expect(result).toEqual(mockJob);
    });
  });

  describe("processJob", () => {
    it("should process a job and update its status", async () => {
      const jobWithSave = {
        ...mockJob,
        result: false, // Initially false, will be set to true
        save: jest.fn().mockResolvedValue(mockJob),
      };
      (jobModel.findById as jest.Mock).mockResolvedValueOnce(jobWithSave);

      await service.processJob("1");
      jest.advanceTimersByTime(2000);

      expect(jobWithSave.status).toBe(JobStatus.VALID);
      expect(jobWithSave.result).toBe(true);
      expect(jobWithSave.save).toHaveBeenCalled();
      expect(redis.publish).toHaveBeenCalledWith(
        "job-updates",
        JSON.stringify({
          jobId: "1",
          status: JobStatus.VALID,
          result: true,
        })
      );
    });

    it("should handle invalid regex pattern", async () => {
      const jobWithSave = {
        ...mockJob,
        regexPattern: "*", // invalid regex
        result: undefined, // Add result property
        save: jest.fn().mockResolvedValue(mockJob),
      };
      (jobModel.findById as jest.Mock).mockResolvedValueOnce(jobWithSave);

      await expect(service.processJob("1")).rejects.toThrow();
      jest.advanceTimersByTime(2000);

      expect(jobWithSave.status).toBe(JobStatus.INVALID);
      expect(jobWithSave.result).toBe(false);
      expect(jobWithSave.save).toHaveBeenCalled();
    });

    it("should handle Redis publish error", async () => {
      const jobWithSave = {
        ...mockJob,
        result: undefined, // Add result property
        save: jest.fn().mockResolvedValue(mockJob),
      };
      (jobModel.findById as jest.Mock).mockResolvedValueOnce(jobWithSave);
      redis.publish.mockRejectedValueOnce(new Error("Redis error"));

      await service.processJob("1");
      jest.advanceTimersByTime(2000);
      expect(jobWithSave.save).toHaveBeenCalled();
    });
  });
});
