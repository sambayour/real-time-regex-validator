import { Injectable, OnModuleInit } from "@nestjs/common";
import { Kafka } from "kafkajs";
import { ConfigService } from "@nestjs/config";
import { JobsService } from "../jobs/jobs.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class JobsConsumer implements OnModuleInit {
  private kafka: Kafka;

  constructor(
    private configService: ConfigService,
    private jobsService: JobsService
  ) {
    const certsPath = path.join(process.cwd(), "certs");

    this.kafka = new Kafka({
      clientId: "regex-validator-consumer",
      brokers: [this.configService.get<string>("KAFKA_BROKERS")],
      ssl: {
        ca: [fs.readFileSync(path.join(certsPath, "ca.pem"), "utf-8")],
        key: fs.readFileSync(path.join(certsPath, "service.key"), "utf-8"),
        cert: fs.readFileSync(path.join(certsPath, "service.cert"), "utf-8"),
      },
    });
  }

  async onModuleInit() {
    await this.consumeJobs();
  }

  private async consumeJobs() {
    const consumer = this.kafka.consumer({ groupId: "regex-validator-group" });

    await consumer.connect();
    await consumer.subscribe({ topic: "jobs", fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const { jobId } = JSON.parse(message.value.toString());
          await this.jobsService.processJob(jobId);
        } catch (error) {
          console.error("Error processing job:", error);
        }
      },
    });
  }
}
