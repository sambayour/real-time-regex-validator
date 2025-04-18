import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  Typography,
} from "@mui/material";
import { api } from "../services/api";

interface JobFormProps {
  onJobCreated: () => void;
}

export const JobForm: React.FC<JobFormProps> = ({ onJobCreated }) => {
  const [input, setInput] = useState("");
  const [regexPattern, setRegexPattern] = useState("");
  const [useCustomRegex, setUseCustomRegex] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setIsSubmitting(true);
      await api.createJob(input, useCustomRegex ? regexPattern : undefined);
      setInput("");
      if (useCustomRegex) {
        setRegexPattern("");
      }
      onJobCreated();
    } catch (error) {
      console.error("Error creating job:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
      <TextField
        fullWidth
        label="Enter text to validate"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isSubmitting}
        sx={{ mb: 2 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={useCustomRegex}
            onChange={(e) => setUseCustomRegex(e.target.checked)}
            disabled={isSubmitting}
          />
        }
        label="Use custom regex pattern"
        sx={{ mb: 1 }}
      />

      {useCustomRegex && (
        <TextField
          fullWidth
          label="Enter custom regex pattern"
          value={regexPattern}
          onChange={(e) => setRegexPattern(e.target.value)}
          disabled={isSubmitting}
          sx={{ mb: 2 }}
          placeholder="e.g. ^[A-Za-z0-9]+$"
          helperText="If not provided, the default pattern from the backend will be used"
        />
      )}

      {!useCustomRegex && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Using default regex pattern from the server.
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={
          isSubmitting ||
          !input.trim() ||
          (useCustomRegex && !regexPattern.trim())
        }
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </Box>
  );
};
