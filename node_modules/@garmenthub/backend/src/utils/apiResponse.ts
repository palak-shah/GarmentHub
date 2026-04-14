import { Response } from 'express';

export function success(res: Response, data: unknown = null, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created(res: Response, data: unknown, message = 'Created') {
  return success(res, data, message, 201);
}

export function fail(res: Response, error: string, status = 400, details?: unknown) {
  return res.status(status).json({ success: false, error, details });
}
