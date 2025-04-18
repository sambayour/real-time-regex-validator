# Real-Time Regex Validator Backend

This is the backend service for the Real-Time Regex Validator application, a tool that allows users to test string patterns against regular expressions in real-time.

## Technologies Used

- **Node.js** - JavaScript runtime
- **NestJS** - Progressive Node.js framework
- **MongoDB** - NoSQL database for storing job records
- **Kafka** - Distributed event streaming platform for job processing
- **Redis** - In-memory data store for real-time updates via WebSockets
- **Jest** - Testing framework
- **WebSockets** - For real-time updates to the client

## Prerequisites

- Node.js (v18.x or higher)
- MongoDB (local instance or cloud provider)
- Kafka (local instance or cloud provider like Aiven)
- Redis (local instance or cloud provider like Redis Cloud)

## Project Structure

```
backend/
├── certs/               # SSL certificates for Kafka
├── src/
│   ├── consumers/       # Kafka consumers
│   ├── gateways/        # WebSocket gateways for real-time updates
│   ├── jobs/            # Jobs module with controllers, services, and entities
│   │   ├── dto/         # Data Transfer Objects
│   ├── scripts/         # Utility scripts (e.g., Kafka topic creation)
│   ├── app.module.ts    # Main application module
│   └── main.ts          # Application entry point
├── .env                 # Environment variables
├── Dockerfile           # Docker configuration
└── package.json         # Dependencies and scripts
```

## Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root of the backend directory with the following variables:

```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/regex-validator
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
KAFKA_BROKERS=localhost:9092
REGEX_PATTERN=^[A-Za-z0-9]+$
PROCESSING_DELAY=2000
```

### Environment Variables Explanation:

- `NODE_ENV`: Application environment (development, production)
- `MONGODB_URI`: Connection string for MongoDB
- `REDIS_URL`: Connection URL for Redis (preferred over individual components)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Individual Redis connection parameters (fallback if URL not provided)
- `KAFKA_BROKERS`: Comma-separated list of Kafka brokers
- `REGEX_PATTERN`: Default regex pattern to use when none is provided
- `PROCESSING_DELAY`: Artificial delay in milliseconds for job processing (simulates processing time)

## Kafka Setup

1. Create a Kafka topic named "jobs"

```bash
npm run create-topic
```

This script will use the Kafka broker configuration in your `.env` file to create the "jobs" topic.

## SSL Certificates

If you're using a cloud Kafka provider, you'll need to place the SSL certificates in the `certs` directory:

- `ca.pem`: CA certificate
- `service.key`: Service key
- `service.cert`: Service certificate

## Running the Application

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

## API Endpoints

### POST /jobs

Creates a new regex validation job.

**Request Body:**

```json
{
  "input": "string to validate",
  "regexPattern": "regex pattern to use (optional)"
}
```

If `regexPattern` is not provided, the default pattern from the environment variable `REGEX_PATTERN` will be used.

**Response:**

```json
{
  "_id": "job_id",
  "input": "string to validate",
  "regexPattern": "regex pattern used",
  "status": "VALIDATING",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### GET /jobs

Retrieves all jobs, sorted by creation date (newest first).

**Response:**

```json
[
  {
    "_id": "job_id",
    "input": "string that was validated",
    "regexPattern": "regex pattern used",
    "status": "VALID" | "INVALID" | "VALIDATING",
    "result": true | false,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  },
  ...
]
```

### GET /jobs/:id

Retrieves a specific job by ID.

**Response:**

```json
{
  "_id": "job_id",
  "input": "string that was validated",
  "regexPattern": "regex pattern used",
  "status": "VALID" | "INVALID" | "VALIDATING",
  "result": true | false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## WebSocket Events

The backend provides real-time updates via WebSockets.

### Client -> Server

- `subscribe`: Subscribe to job updates

### Server -> Client

- `job-update`: Sent when a job status changes
  ```json
  {
    "jobId": "job_id",
    "status": "VALID" | "INVALID",
    "result": true | false
  }
  ```

## Flow of the Application

1. Client submits a new job via REST API
2. Backend creates a job record in MongoDB with status "VALIDATING"
3. Job is sent to Kafka for processing
4. Kafka consumer processes the job:
   - Tests the input against the regex pattern
   - Updates the job status in MongoDB
   - Publishes an update to Redis
5. WebSocket gateway subscribes to Redis and sends real-time updates to connected clients

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run test:cov
```

## Troubleshooting

### Redis Connection Issues

If you encounter Redis connection errors:

1. Check that your Redis credentials are correct
2. Ensure Redis is running and accessible
3. If using Redis Cloud, ensure the URL includes the protocol (`rediss://` for SSL)
4. Check firewall settings if connecting to a remote Redis instance

### Kafka Issues

If Kafka is not processing jobs:

1. Verify the "jobs" topic exists using the Kafka admin tools
2. Check that SSL certificates are correctly placed in the `certs` directory
3. Ensure Kafka brokers are accessible

### MongoDB Connection Issues

If there are MongoDB connection errors:

1. Verify your connection string in the `.env` file
2. Check network connectivity to your MongoDB instance
3. Ensure the database user has the correct permissions

## License

[MIT](LICENSE)
