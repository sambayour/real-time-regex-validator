import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { Job } from "./job.entity";
import { isValidObjectId } from "mongoose";
import { ConfigService } from "@nestjs/config";

@Controller("jobs")
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService
  ) {
    // Log to make sure ConfigService is correctly injected
    const defaultPattern = this.configService.get<string>("REGEX_PATTERN");
    this.logger.log(`Default regex pattern from config: ${defaultPattern}`);
  }

  @Post()
  async create(@Body() requestBody: any): Promise<Job> {
    this.logger.log(
      `Received create job request with body: ${JSON.stringify(requestBody)}`
    );

    try {
      // Handle frontend sending string directly
      if (typeof requestBody === "string") {
        try {
          requestBody = JSON.parse(requestBody);
        } catch (e) {
          this.logger.error(
            `Failed to parse string request body: ${e.message}`
          );
          requestBody = { input: requestBody };
        }
      }

      // Handle both old and new request formats
      let createJobDto: CreateJobDto;

      // Get the default pattern first to make sure ConfigService is working
      const defaultPattern = this.configService.get<string>("REGEX_PATTERN");
      this.logger.log(
        `Default pattern from env: ${defaultPattern || "NOT FOUND"}`
      );

      // If only input is provided (old frontend)
      if (requestBody.input && !requestBody.regexPattern) {
        const pattern = defaultPattern || "^[A-Za-z0-9]+$";
        this.logger.log(`Using default regex pattern: ${pattern}`);

        createJobDto = {
          input: requestBody.input,
          regexPattern: pattern,
        };
      } else {
        // If both fields are provided (new format)
        createJobDto = requestBody as CreateJobDto;
      }

      this.logger.log(`Final job data: ${JSON.stringify(createJobDto)}`);

      // Validate input
      if (!createJobDto.input || createJobDto.input.trim() === "") {
        throw new BadRequestException("Input string cannot be empty");
      }

      // Validate regexPattern
      if (
        !createJobDto.regexPattern ||
        createJobDto.regexPattern.trim() === ""
      ) {
        throw new BadRequestException("Regex pattern cannot be empty");
      }

      try {
        // Try to create a RegExp to validate the pattern
        new RegExp(createJobDto.regexPattern);
      } catch (error) {
        throw new BadRequestException(
          `Invalid regex pattern: ${error.message}`
        );
      }

      const result = await this.jobsService.create(createJobDto);
      this.logger.log(`Job created successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating job: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create job: ${error.message}`
      );
    }
  }

  @Get()
  async findAll(): Promise<Job[]> {
    try {
      return await this.jobsService.findAll();
    } catch (error) {
      this.logger.error(
        `Error fetching all jobs: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Job> {
    // Validate if id is a valid MongoDB ObjectId
    if (!isValidObjectId(id)) {
      throw new BadRequestException("Invalid ID format");
    }

    try {
      const job = await this.jobsService.findOne(id);
      if (!job) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }
      return job;
    } catch (error) {
      this.logger.error(
        `Error fetching job ${id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
