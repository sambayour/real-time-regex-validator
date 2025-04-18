import { JobStatus } from "../job.entity";

export class JobResponseDto {
  id: string;
  input: string;
  regexPattern: string;
  status: JobStatus;
  result?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
