import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
      });
    }
  }

  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Too many images (max 10 per upload)'
          : err.message;
    return res.status(400).json({ success: false, error: msg });
  }

  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ success: false, error: err.message });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
