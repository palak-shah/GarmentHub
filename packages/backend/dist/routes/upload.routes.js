"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
exports.uploadRoutes = (0, express_1.Router)();
exports.uploadRoutes.post('/images', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), upload_1.uploadProductImages.array('files', 10), upload_controller_1.UploadController.uploadProductImages);
//# sourceMappingURL=upload.routes.js.map