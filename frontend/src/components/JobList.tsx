import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import { Job, JobStatus } from "../types/job";

interface JobListProps {
  jobs: Job[];
}

const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case JobStatus.VALIDATING:
      return "warning";
    case JobStatus.VALID:
      return "success";
    case JobStatus.INVALID:
      return "error";
    default:
      return "default";
  }
};

export const JobList: React.FC<JobListProps> = ({ jobs }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Input</TableCell>
            <TableCell>Regex Pattern</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Result</TableCell>
            <TableCell>Created At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id}>
              <TableCell>{job._id}</TableCell>
              <TableCell>{job.input}</TableCell>
              <TableCell>{job.regexPattern}</TableCell>
              <TableCell>
                <Chip
                  label={job.status}
                  color={getStatusColor(job.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {job.status !== JobStatus.VALIDATING && (
                  <Chip
                    label={job.result ? "Valid" : "Invalid"}
                    color={job.result ? "success" : "error"}
                    size="small"
                  />
                )}
              </TableCell>
              <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
