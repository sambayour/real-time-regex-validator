import axios from "axios";
import { Job } from "../types/job";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export const api = {
  createJob: async (input: string, regexPattern?: string): Promise<Job> => {
    const payload = regexPattern ? { input, regexPattern } : { input };
    const response = await axios.post(`${API_URL}/jobs`, payload);
    return response.data;
  },

  getJobs: async (): Promise<Job[]> => {
    const response = await axios.get(`${API_URL}/jobs`);
    return response.data;
  },

  getJob: async (id: string): Promise<Job> => {
    const response = await axios.get(`${API_URL}/jobs/${id}`);
    return response.data;
  },
};
