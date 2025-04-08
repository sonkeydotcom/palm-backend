import { config } from "dotenv";

config({ path: "./.env.development.local" });

export const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRATION_TIME,
  SMTP_PORT,
  SMTP_HOST,
  SMTP_USER,
  SMTP_PASS,
  SQUADCO_API_KEY,
  SQUADCO_PRIVATE_KEY,

  //   CLIENT_ORIGIN,
  //   REDIS_HOST,
  //   REDIS_PORT,
  //   REDIS_PASSWORD,
  //   REDIS_SESSION_PREFIX,
  //   REDIS_SESSION_EXPIRATION_TIME,
  //   REDIS_CLUSTER_NODES,
  //   REDIS_CLUSTER_OPTIONS,
  //   REDIS_CLUSTER_READ_PREFERENCE,
  //   REDIS_CLUSTER_MAX_RETRY_ATTEMPTS,
  //   REDIS_CLUSTER_RETRY_DELAY,
  //   REDIS_CLUSTER_RETRY_JITTER,
  //   REDIS_CLUSTER_MAX_RETRY_DELAY,
  //   REDIS_CLUSTER_MIN_RETRY_DELAY,
  //   REDIS_CLUSTER_MAX_CONNECTIONS,
  //   REDIS_CLUSTER_MAX_WRITE_BUFFER_SIZE,
  //   REDIS_CLUSTER_CONNECT_TIMEOUT,
  //   REDIS_CLUSTER_RETRY_ON_CONNECTION_FAILURE,
} = process.env;

// // src/config/env.ts
// import dotenv from 'dotenv';
// import { z } from 'zod';

// dotenv.config();

// const envSchema = z.object({
//   PORT: z.string().default('3000'),
//   DATABASE_URL: z.string(),
// });

// const env = envSchema.parse(process.env);

// export default env;
