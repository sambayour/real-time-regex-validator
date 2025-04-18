export enum JobStatus {
  VALIDATING = "VALIDATING",
  VALID = "VALID",
  INVALID = "INVALID",
  ERROR = "ERROR",
}

export interface Job {
  _id: string;
  input: string;
  regexPattern: string;
  status: JobStatus;
  result?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobUpdate {
  jobId: string;
  status: JobStatus;
  result?: boolean;
}
