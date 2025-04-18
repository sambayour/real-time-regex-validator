import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { createClient } from "redis";
import { ConfigService } from "@nestjs/config";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class JobsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(JobsGateway.name);
  private redis;
  private redisSubscriber;

  constructor(private configService: ConfigService) {
    this.initRedisClients();
  }

  private async initRedisClients() {
    try {
      const redisUrl = this.configService.get<string>("REDIS_URL");

      if (redisUrl) {
        this.logger.log(
          `Connecting to Redis with URL: ${redisUrl.replace(/:.*@/, ":****@")}`
        );

        // Create main Redis client
        this.redis = createClient({
          url: redisUrl,
        });

        // Create subscriber client
        this.redisSubscriber = createClient({
          url: redisUrl,
        });

        // Set up event handlers for main client
        this.redis.on("error", (err) => {
          this.logger.error(`Redis error: ${err.message}`);
        });

        this.redis.on("connect", () => {
          this.logger.log("Connected to Redis");
        });

        this.redis.on("ready", () => {
          this.logger.log("Redis client is ready");
        });

        // Set up event handlers for subscriber client
        this.redisSubscriber.on("error", (err) => {
          this.logger.error(`Redis subscriber error: ${err.message}`);
        });

        this.redisSubscriber.on("connect", () => {
          this.logger.log("Redis subscriber connected");
        });

        this.redisSubscriber.on("ready", () => {
          this.logger.log("Redis subscriber is ready");
        });

        // Connect to Redis
        await this.redis.connect();
        await this.redisSubscriber.connect();

        // Subscribe to job-updates channel
        await this.subscribeToChannel();
      } else {
        this.logger.error("Redis URL is not properly set");
      }
    } catch (error) {
      this.logger.error(`Error initializing Redis clients: ${error.message}`);
    }
  }

  private async subscribeToChannel() {
    try {
      await this.redisSubscriber.subscribe("job-updates", (message) => {
        this.logger.log(`Received message from job-updates channel`);
        this.server.emit("job-update", JSON.parse(message));
      });

      this.logger.log("Successfully subscribed to job-updates channel");
    } catch (error) {
      this.logger.error(`Error subscribing to channel: ${error.message}`);
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(client: Socket) {
    return {
      event: "subscribed",
      data: "Successfully subscribed to job updates",
    };
  }
}
