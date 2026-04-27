import { Response } from 'express';
import { env } from '../config/env';

export function success(res: Response, data: unknown = null, message = 'Success', status = 200) {
  try {
    return res.status(status).json({ success: true, data, message });
  } catch (e) {
    console.error('Response JSON serialization failed:', e);
    const hint =
      env.exposeErrorDetails && e instanceof Error ? `: ${e.message}` : '';
    return res.status(500).json({
      success: false,
      error: `Failed to build response${hint}`,
    });
  }
}

export function created(res: Response, data: unknown, message = 'Created') {
  return success(res, data, message, 201);
}

export function fail(res: Response, error: string, status = 400, details?: unknown) {
  return res.status(status).json({ success: false, error, details });
}
