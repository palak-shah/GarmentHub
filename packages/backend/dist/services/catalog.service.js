"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogService = void 0;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
const attrOrderBy = [{ sortOrder: 'asc' }, { name: 'asc' }];
class CatalogService {
    static async listCategoriesForVendor(vendorId) {
        const categories = await db_1.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                attributes: { orderBy: attrOrderBy },
                vendorAttributes: {
                    where: { vendorId },
                    orderBy: attrOrderBy,
                },
            },
        });
        return categories.map(({ vendorAttributes, attributes, ...rest }) => ({
            ...rest,
            defaultAttributes: attributes,
            vendorAttributes,
        }));
    }
    static async createVendorAttribute(vendorId, categoryId, name, sortOrder) {
        const cat = await db_1.prisma.category.findUnique({ where: { id: categoryId } });
        if (!cat)
            throw new errors_1.NotFoundError('Category');
        return db_1.prisma.vendorCategoryAttribute.create({
            data: {
                vendorId,
                categoryId,
                name: name.trim(),
                sortOrder: sortOrder ?? 0,
            },
        });
    }
    static async updateVendorAttribute(vendorId, categoryId, attributeId, data) {
        const row = await db_1.prisma.vendorCategoryAttribute.findFirst({
            where: { id: attributeId, vendorId, categoryId },
        });
        if (!row)
            throw new errors_1.NotFoundError('Attribute');
        return db_1.prisma.vendorCategoryAttribute.update({
            where: { id: attributeId },
            data: {
                ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
            },
        });
    }
    static async deleteVendorAttribute(vendorId, categoryId, attributeId) {
        const row = await db_1.prisma.vendorCategoryAttribute.findFirst({
            where: { id: attributeId, vendorId, categoryId },
        });
        if (!row)
            throw new errors_1.NotFoundError('Attribute');
        await db_1.prisma.vendorCategoryAttribute.delete({ where: { id: attributeId } });
        return { deleted: true };
    }
}
exports.CatalogService = CatalogService;
//# sourceMappingURL=catalog.service.js.map