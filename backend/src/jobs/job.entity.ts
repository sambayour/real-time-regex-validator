import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type JobDocument = Job & Document;

export enum JobStatus {
  VALIDATING = "VALIDATING",
  VALID = "VALID",
  INVALID = "INVALID",
}

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true, type: String })
  input: string;

  @Prop({ required: true, type: String })
  regexPattern: string;

  @Prop({
    required: true,
    enum: JobStatus,
    default: JobStatus.VALIDATING,
    type: String,
  })
  status: JobStatus;

  @Prop({ type: Boolean })
  result?: boolean;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Add indexes for better query performance
JobSchema.index({ status: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ updatedAt: -1 });
