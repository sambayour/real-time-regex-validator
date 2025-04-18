import React, { useEffect, useState } from "react";
import { Container, Typography, Box } from "@mui/material";
import { io, Socket } from "socket.io-client";
import { Job, JobUpdate } from "./types/job";
import { JobForm } from "./components/JobForm";
import { JobList } from "./components/JobList";
import { api } from "./services/api";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      socket.emit("subscribe");
    });

    socket.on("job-update", (update: JobUpdate) => {
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job._id === update.jobId
            ? { ...job, status: update.status, result: update.result }
            : job
        )
      );
    });

    return () => {
      socket.off("connect");
      socket.off("job-update");
    };
  }, [socket]);

  const fetchJobs = async () => {
    try {
      const fetchedJobs = await api.getJobs();
      setJobs(fetchedJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Real-Time Regex Validator
        </Typography>
        <JobForm onJobCreated={fetchJobs} />
        <JobList jobs={jobs} />
      </Box>
    </Container>
  );
}

export default App;
