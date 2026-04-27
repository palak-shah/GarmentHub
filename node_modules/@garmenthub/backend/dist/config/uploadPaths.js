"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_IMAGES_DIR = exports.UPLOADS_ROOT = void 0;
exports.ensureUploadDirs = ensureUploadDirs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Resolved from this file: `packages/backend/uploads` */
exports.UPLOADS_ROOT = path_1.default.join(__dirname, '..', '..', 'uploads');
exports.PRODUCT_IMAGES_DIR = path_1.default.join(exports.UPLOADS_ROOT, 'products');
function ensureUploadDirs() {
    fs_1.default.mkdirSync(exports.PRODUCT_IMAGES_DIR, { recursive: true });
}
//# sourceMappingURL=uploadPaths.js.map