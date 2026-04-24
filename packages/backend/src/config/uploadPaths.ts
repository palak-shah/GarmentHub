import fs from 'fs';
import path from 'path';

/** Resolved from this file: `packages/backend/uploads` */
export const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

export const PRODUCT_IMAGES_DIR = path.join(UPLOADS_ROOT, 'products');

export function ensureUploadDirs(): void {
  fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
}
