import dotenv from 'dotenv';
import { z } from "zod";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'JWT_SECRET',
  'GUEST_FRONTEND_URL',
  'DATABASE_URL'
] as const;

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

const envSchema = z.object({
  google: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    callbackURL: z.string(),
  }),
  jwt: z.object({
    secret: z.string(),
  }),
  frontend: z.object({
    url: z.string(),
  }),
  database: z.object({
    url: z.string(),
  }),
  port: z.string().transform(str => Number(str)).optional(),
  nodeEnv: z.string().transform(str => str as 'development' | 'production').optional(),
  aws: z.object({
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    region: z.string(),
    bucket: z.string(),
  }),
});

export const env = envSchema.parse({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!
  },
  jwt: {
    secret: process.env.JWT_SECRET!
  },
  frontend: {
    url: process.env.GUEST_FRONTEND_URL!
  },
  database: {
    url: process.env.DATABASE_URL!
  },
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
  },
} as const); 

export const CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3003',
] ;