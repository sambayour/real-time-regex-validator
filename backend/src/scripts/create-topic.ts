import { Kafka } from "kafkajs";
import * as fs from "fs";
import * as path from "path";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";

async function createTopic() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);

  const certsPath = path.join(process.cwd(), "certs");
  const kafkaBrokers = configService.get<string>("KAFKA_BROKERS");

  if (!kafkaBrokers) {
    console.error("KAFKA_BROKERS environment variable is not set");
    await app.close();
    return;
  }

  const kafka = new Kafka({
    clientId: "topic-creator",
    brokers: kafkaBrokers.split(","),
    ssl: {
      ca: [fs.readFileSync(path.join(certsPath, "ca.pem"), "utf-8")],
      key: fs.readFileSync(path.join(certsPath, "service.key"), "utf-8"),
      cert: fs.readFileSync(path.join(certsPath, "service.cert"), "utf-8"),
      rejectUnauthorized: false,
    },
  });

  const admin = kafka.admin();

  try {
    await admin.connect();
    console.log("Connected to Kafka");

    const existingTopics = await admin.listTopics();
    if (existingTopics.includes("jobs")) {
      console.log("Topic 'jobs' already exists");
    } else {
      await admin.createTopics({
        topics: [
          {
            topic: "jobs",
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
      });
      console.log("Topic 'jobs' created successfully");
    }
  } catch (error) {
    console.error("Error creating topic:", error);
  } finally {
    await admin.disconnect();
    await app.close();
  }
}

createTopic().catch(console.error);
