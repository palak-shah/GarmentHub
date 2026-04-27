import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV;

/** Local runs often omit NODE_ENV (especially on Windows). Only treat explicit `production` as non-verbose. */
export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  otpExpiryMinutes: 5,
  /** Include underlying error messages in JSON responses (off in production unless forced). */
  exposeErrorDetails: nodeEnv !== 'production' || process.env.API_ERROR_DETAILS === '1',
};
