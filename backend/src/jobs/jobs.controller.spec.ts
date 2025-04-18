import { Test, TestingModule } from "@nestjs/testing";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { Job, JobStatus } from "./job.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("JobsController", () => {
  let controller: JobsController;
  let service: JobsService;

  const mockJob: Job = {
    input: "test123",
    regexPattern: "^[A-Za-z0-9]+$",
    status: JobStatus.VALIDATING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJobsService = {
    create: jest.fn().mockResolvedValue(mockJob),
    findAll: jest.fn().mockResolvedValue([mockJob]),
    findOne: jest.fn().mockResolvedValue(mockJob),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a new job", async () => {
      const createJobDto: CreateJobDto = {
        input: "test123",
        regexPattern: "^[A-Za-z0-9]+$",
      };
      const result = await controller.create(createJobDto);

      expect(result).toEqual(mockJob);
      expect(service.create).toHaveBeenCalledWith(createJobDto);
    });

    it("should handle empty input", async () => {
      const createJobDto: CreateJobDto = {
        input: "",
        regexPattern: "^[A-Za-z0-9]+$",
      };
      await expect(controller.create(createJobDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should handle empty regex pattern", async () => {
      const createJobDto: CreateJobDto = {
        input: "test123",
        regexPattern: "",
      };
      await expect(controller.create(createJobDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should handle service error", async () => {
      mockJobsService.create.mockRejectedValueOnce(new Error("Service error"));
      const createJobDto: CreateJobDto = {
        input: "test123",
        regexPattern: "^[A-Za-z0-9]+$",
      };
      await expect(controller.create(createJobDto)).rejects.toThrow(
        "Service error"
      );
    });
  });

  describe("findAll", () => {
    it("should return an array of jobs", async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockJob]);
      expect(service.findAll).toHaveBeenCalled();
    });

    it("should handle service error", async () => {
      mockJobsService.findAll.mockRejectedValueOnce(new Error("Service error"));
      await expect(controller.findAll()).rejects.toThrow("Service error");
    });
  });

  describe("findOne", () => {
    it("should return a single job", async () => {
      const result = await controller.findOne("1");

      expect(result).toEqual(mockJob);
      expect(service.findOne).toHaveBeenCalledWith("1");
    });

    it("should handle invalid ID format", async () => {
      await expect(controller.findOne("invalid-id")).rejects.toThrow(
        BadRequestException
      );
    });

    it("should handle job not found", async () => {
      mockJobsService.findOne.mockRejectedValueOnce(
        new NotFoundException("Job not found")
      );
      await expect(controller.findOne("1")).rejects.toThrow(NotFoundException);
    });

    it("should handle service error", async () => {
      mockJobsService.findOne.mockRejectedValueOnce(new Error("Service error"));
      await expect(controller.findOne("1")).rejects.toThrow("Service error");
    });
  });
});
