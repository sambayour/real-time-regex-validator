# Real-Time Regex Validator

A real-time web application that validates text strings against configurable regular expressions. The system processes submissions asynchronously and provides live status updates to users.

## Architecture Overview

The application is built as a distributed system with the following components:

- **Frontend**: React-based web interface for submitting strings and viewing validation results
- **Backend**: NestJS service handling validation logic and job management
- **Database**: MongoDB for persistent storage of jobs and their statuses
- **Message Queue**: Kafka for handling job processing and status updates
- **Cache**: Redis for inter-service communication and caching

## Component Responsibilities

- **Frontend**:

  - Provides user interface for string submission
  - Displays real-time job status updates
  - Shows job history and current status
  - Communicates with backend via WebSocket

- **Backend**:

  - Exposes REST API for job creation and retrieval
  - Processes validation jobs asynchronously
  - Manages job status updates
  - Broadcasts real-time updates to connected clients

- **Infrastructure**:
  - MongoDB: Stores job metadata and status
  - Kafka: Handles job processing queue and event delivery
  - Redis: Facilitates real-time communication and caching

## Real-Time Update Mechanism

The system uses a combination of WebSocket and Kafka for real-time updates:

1. Frontend establishes WebSocket connection with backend
2. Backend publishes job status updates to Kafka
3. Kafka consumers process updates and broadcast to connected clients
4. Frontend receives updates and updates UI accordingly

## System Reliability & Fault Tolerance

- **Job Processing**: Asynchronous processing with retry mechanisms
- **Data Persistence**: MongoDB ensures job data is not lost
- **Event Handling**: Kafka provides reliable message delivery
- **Error Handling**: Comprehensive error handling at all layers
- **Monitoring**: Built-in logging and status tracking

## Deployment & Scaling

The system can be deployed to AWS with the following considerations:

- **ECS/EKS**: Container orchestration for services
- **RDS**: Managed MongoDB instance
- **MSK**: Managed Kafka service
- **ElastiCache**: Managed Redis service
- **ALB**: Load balancing for frontend and backend
- **CloudWatch**: Monitoring and logging
- **Parameter Store**: Configuration management

## Getting Started

1. Clone the repository
2. Set environment variables (optional):
   ```bash
   export REGEX_PATTERN="your-pattern"
   export PROCESSING_DELAY=2000
   ```
3. Start the application:
   ```bash
   docker compose up --build
   ```
4. Access the application at http://localhost:61234

## Development

The application consists of two main components:

- **Frontend**: [React application](./frontend/README.md) with Material UI
- **Backend**: [NestJS application](./backend/README.md) with MongoDB, Kafka, and Redis

See the component-specific READMEs for detailed documentation:

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)

## Environment Variables

- `REGEX_PATTERN`: Regular expression pattern for validation (default: ^[A-Za-z0-9]+$)
- `PROCESSING_DELAY`: Delay in milliseconds for job processing (default: 2000)

![Real-Time Regex Validator Screenshot](docs/images/app-screenshot.png)
