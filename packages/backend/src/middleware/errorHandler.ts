import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

function safeMessage(err: unknown): string {
  if (err instanceof Error) return (err.message || err.name || 'Error').slice(0, 2000);
  if (typeof err === 'string') return err.slice(0, 2000);
  return 'Unknown error';
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    console.error('Error after headers sent:', err);
    return;
  }

  try {
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
      if (err.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: 'Invalid reference (e.g. user or product no longer exists)',
        });
      }
      if (err.code === 'P2021' || err.code === 'P2022') {
        return res.status(500).json({
          success: false,
          error:
            'Database schema is out of date. From packages/backend run: npx prisma migrate deploy && npx prisma generate, then restart the API.',
        });
      }
      console.error('Prisma KnownRequestError', err.code, err.message, err.meta);
      return res.status(500).json({
        success: false,
        error: env.exposeErrorDetails
          ? `Database error (${err.code}): ${err.message}`
          : 'A database error occurred. Check server logs.',
      });
    }

    if (
      err instanceof Prisma.PrismaClientUnknownRequestError ||
      err instanceof Prisma.PrismaClientInitializationError ||
      err instanceof Prisma.PrismaClientRustPanicError
    ) {
      console.error('Prisma client error:', err);
      return res.status(500).json({
        success: false,
        error: env.exposeErrorDetails ? err.message : 'Database error. Check server logs.',
      });
    }

    const errMsg = safeMessage(err);
    if (
      errMsg.includes('Unknown argument') ||
      errMsg.includes('Unknown field') ||
      errMsg.includes('does not exist') ||
      /column .* does not exist/i.test(errMsg) ||
      errMsg.includes('traderOfferUnitPrice') ||
      errMsg.includes('traderTargetUnitPrice') ||
      errMsg.includes('42703')
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Database schema is out of date. From packages/backend run: npx prisma migrate deploy && npx prisma generate, then restart the API.',
      });
    }

    if (
      err instanceof Prisma.PrismaClientValidationError ||
      (err instanceof Error && err.name === 'PrismaClientValidationError')
    ) {
      return res.status(500).json({
        success: false,
        error: env.exposeErrorDetails
          ? `Prisma validation: ${errMsg}`
          : 'Database client does not match the schema. From packages/backend run: npx prisma generate, then restart the API.',
      });
    }

    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? `Each image must be ${env.maxUploadFileMb}MB or smaller`
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
            ? `Too many images (max ${env.maxUploadFilesPerRequest} per upload)`
            : err.message;
      return res.status(400).json({ success: false, error: msg });
    }

    if (errMsg === 'Only image files are allowed') {
      return res.status(400).json({ success: false, error: errMsg });
    }

    console.error('Unhandled error:', err);
    return res.status(500).json({
      success: false,
      error: env.exposeErrorDetails ? `Internal server error: ${errMsg}` : 'Internal server error',
    });
  } catch (handlerErr) {
    console.error('errorHandler failed:', handlerErr, 'original:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
