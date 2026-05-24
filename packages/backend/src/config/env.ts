import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV;

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Local runs often omit NODE_ENV (especially on Windows). Only treat explicit `production` as non-verbose. */
export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  otpExpiryMinutes: 5,
  /** Include underlying error messages in JSON responses (off in production unless forced). */
  exposeErrorDetails: nodeEnv !== 'production' || process.env.API_ERROR_DETAILS === '1',
  /**
   * Browser `Origin` values allowed to call this API (cross-origin).
   * Example: `https://garmenthub.in,https://www.garmenthub.in,http://localhost:3000`
   * When empty, CORS falls back to reflecting any `Origin` (legacy permissive behavior).
   */
  corsOrigins: parseCorsOrigins(),
};
