import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  lmStudioUrl: process.env.LM_STUDIO_URL || 'http://localhost:1234',
  apiToken: process.env.API_TOKEN,
  modelName: process.env.LM_MODEL_NAME || 'default-model',
  nodeEnv: process.env.NODE_ENV || 'development',
  domain: process.env.DOMAIN || 'localhost',
  email: process.env.EMAIL || 'your-email@example.com',
  certValidityDays: parseInt(process.env.CERT_VALIDITY_DAYS || '365', 10)
};

export type Config = typeof config;