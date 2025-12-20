import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // CrewAI
  crewAiApiUrl: process.env.CREWAI_API_URL || 'http://localhost:8000',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',

  // Feature flags
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

export default config;
