"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productQueryDto = exports.updateProductDto = exports.createProductDto = void 0;
const zod_1 = require("zod");
exports.createProductDto = zod_1.z.object({
    name: zod_1.z.string().min(1),
    images: zod_1.z.array(zod_1.z.string()).default([]),
    brandId: zod_1.z.string().min(1),
    categoryId: zod_1.z.string().min(1),
    pattern: zod_1.z.string().default(''),
    fabric: zod_1.z.string().default(''),
    color: zod_1.z.string().default(''),
    attributeValues: zod_1.z.record(zod_1.z.string()).optional(),
    price: zod_1.z.number().positive().optional(),
    moq: zod_1.z.number().int().positive().default(1),
    status: zod_1.z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
});
exports.updateProductDto = exports.createProductDto.partial();
exports.productQueryDto = zod_1.z.object({
    search: zod_1.z.string().optional(),
    brandId: zod_1.z.string().optional(),
    categoryId: zod_1.z.string().optional(),
    pattern: zod_1.z.string().optional(),
    fabric: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    minPrice: zod_1.z.coerce.number().optional(),
    maxPrice: zod_1.z.coerce.number().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(50).default(20),
});
//# sourceMappingURL=product.dto.js.map