"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVendorCategoryAttributeDto = exports.createVendorCategoryAttributeDto = exports.updateCategoryAttributeDto = exports.createCategoryAttributeDto = exports.updateCategoryDto = exports.createCategoryDto = void 0;
const zod_1 = require("zod");
const attrInput = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.createCategoryDto = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    attributes: zod_1.z.array(attrInput).optional(),
});
exports.updateCategoryDto = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
});
exports.createCategoryAttributeDto = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.updateCategoryAttributeDto = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).optional(),
    sortOrder: zod_1.z.number().int().optional(),
})
    .refine((d) => d.name !== undefined || d.sortOrder !== undefined, {
    message: 'Provide name and/or sortOrder',
});
exports.createVendorCategoryAttributeDto = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    sortOrder: zod_1.z.number().int().optional(),
});
exports.updateVendorCategoryAttributeDto = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).optional(),
    sortOrder: zod_1.z.number().int().optional(),
})
    .refine((d) => d.name !== undefined || d.sortOrder !== undefined, {
    message: 'Provide name and/or sortOrder',
});
//# sourceMappingURL=category.dto.js.map