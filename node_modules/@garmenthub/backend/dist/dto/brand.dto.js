"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBrandDto = exports.createBrandDto = void 0;
const zod_1 = require("zod");
exports.createBrandDto = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
});
exports.updateBrandDto = exports.createBrandDto;
//# sourceMappingURL=brand.dto.js.map