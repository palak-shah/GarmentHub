"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const apiResponse_1 = require("../utils/apiResponse");
class UploadController {
    static uploadProductImages(req, res, next) {
        try {
            const files = req.files;
            if (!files?.length) {
                (0, apiResponse_1.fail)(res, 'No image files received. Ensure the form field name is "files" and Content-Type is multipart.', 400);
                return;
            }
            const urls = files.map((f) => `/uploads/products/${f.filename}`);
            (0, apiResponse_1.success)(res, { urls });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UploadController = UploadController;
//# sourceMappingURL=upload.controller.js.map