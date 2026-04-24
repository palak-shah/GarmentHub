import { Request, Response, NextFunction } from 'express';
import { fail, success } from '../utils/apiResponse';

export class UploadController {
  static uploadProductImages(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        fail(
          res,
          'No image files received. Ensure the form field name is "files" and Content-Type is multipart.',
          400,
        );
        return;
      }
      const urls = files.map((f) => `/uploads/products/${f.filename}`);
      success(res, { urls });
    } catch (err) {
      next(err);
    }
  }
}
