import dotenv from 'dotenv';

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

// Export validated environment variables
export const env = {
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
  nodeEnv: process.env.NODE_ENV || 'development'
} as const; 