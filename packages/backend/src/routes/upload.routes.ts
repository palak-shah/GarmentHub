import { Router } from 'express';
import { env } from '../config/env';
import { UploadController } from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadProductImages } from '../middleware/upload';

export const uploadRoutes = Router();

uploadRoutes.post(
  '/images',
  authenticate,
  authorize('VENDOR'),
  uploadProductImages.array('files', env.maxUploadFilesPerRequest),
  UploadController.uploadProductImages,
);
