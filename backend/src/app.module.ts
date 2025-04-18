import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { JobsModule } from "./jobs/jobs.module";
import { JobsGateway } from "./gateways/jobs.gateway";
import { JobsConsumer } from "./consumers/jobs.consumer";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://mongodb:27017/regex-validator"
    ),
    JobsModule,
  ],
  providers: [JobsGateway, JobsConsumer],
})
export class AppModule {}
