import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Job, JobDocument, JobStatus } from "./job.entity";
import { CreateJobDto } from "./dto/create-job.dto";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer } from "kafkajs";
import { createClient } from "redis";
import { Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private kafka: Kafka;
  private redis;
  private producer: Producer;

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private configService: ConfigService
  ) {
    const certsPath = path.join(process.cwd(), "certs");

    this.kafka = new Kafka({
      clientId: "regex-validator",
      brokers: [this.configService.get<string>("KAFKA_BROKERS")],
      ssl: {
        ca: [fs.readFileSync(path.join(certsPath, "ca.pem"), "utf-8")],
        key: fs.readFileSync(path.join(certsPath, "service.key"), "utf-8"),
        cert: fs.readFileSync(path.join(certsPath, "service.cert"), "utf-8"),
        rejectUnauthorized: false,
      },
    });

    const redisUrl = this.configService.get<string>("REDIS_URL");

    if (redisUrl) {
      this.redis = createClient({
        url: redisUrl,
      });
    } else {
      const redisHost = this.configService.get<string>("REDIS_HOST");
      const redisPort = this.configService.get<number>("REDIS_PORT");
      const redisPassword = this.configService.get<string>("REDIS_PASSWORD");

      this.redis = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
        },
        password: redisPassword,
      });
    }

    this.redis.on("error", (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.redis.on("connect", () => {
      this.logger.log("Connected to Redis");
    });
  }

  async onModuleInit() {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      await this.redis.connect();
      this.logger.log("Kafka producer and Redis connections established");
    } catch (error) {
      this.logger.error("Failed to connect", error.stack);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer?.disconnect();
      await this.redis.disconnect();
      this.logger.log("Kafka producer and Redis connections closed");
    } catch (error) {
      this.logger.error("Error closing connections", error.stack);
    }
  }

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const now = new Date();
    const job = new this.jobModel({
      ...createJobDto,
      status: JobStatus.VALIDATING,
      createdAt: now,
      updatedAt: now,
    });

    const savedJob = await job.save();

    try {
      await this.producer.send({
        topic: "jobs",
        messages: [
          {
            key: savedJob._id.toString(),
            value: JSON.stringify({
              jobId: savedJob._id.toString(),
              input: savedJob.input,
              regexPattern: savedJob.regexPattern,
            }),
          },
        ],
      });
    } catch (error) {
      this.logger.error("Failed to send job to Kafka", error.stack);
      throw error;
    }

    return savedJob;
  }

  async findAll(): Promise<Job[]> {
    return this.jobModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Job> {
    return this.jobModel.findById(id).exec();
  }

  async processJob(jobId: string): Promise<void> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      const delay = this.configService.get<number>("PROCESSING_DELAY") || 0;
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        const regex = new RegExp(job.regexPattern);
        const isValid = regex.test(job.input);

        job.status = isValid ? JobStatus.VALID : JobStatus.INVALID;
        job.result = isValid;
        job.updatedAt = new Date();
        await job.save();

        await this.redis.publish(
          "job-updates",
          JSON.stringify({
            jobId: job._id,
            status: job.status,
            result: job.result,
          })
        );
      } catch (error) {
        this.logger.error(`Failed to process job ${jobId}`, error.stack);
        job.status = JobStatus.INVALID;
        job.result = false;
        job.updatedAt = new Date();
        await job.save();
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${jobId}`, error.stack);
      throw error;
    }
  }
}
