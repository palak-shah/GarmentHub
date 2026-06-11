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

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const maxUploadFileMb = clampInt(parseInt(process.env.MAX_UPLOAD_FILE_MB || '20', 10), 1, 100);
const maxUploadFilesPerRequest = clampInt(
  parseInt(process.env.MAX_UPLOAD_FILES_PER_REQUEST || '20', 10),
  1,
  50,
);

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
  /**
   * When `true`, also allow `http(s)://` origins whose host is RFC1918 (10/8, 192.168/16, etc.)
   * so Flutter web / static builds served from a LAN IP can call the API without listing each IP.
   */
  corsAllowLanOrigins: process.env.CORS_ALLOW_LAN_ORIGINS === '1' || process.env.CORS_ALLOW_LAN_ORIGINS === 'true',
  /** Per-file cap for multipart product images (Multer). Reverse proxy may need a higher `client_max_body_size`. */
  maxUploadFileMb,
  maxUploadFileBytes: maxUploadFileMb * 1024 * 1024,
  /** Max files in one POST /api/upload/images (must stay ≤ Multer `limits.files`). */
  maxUploadFilesPerRequest,
};
