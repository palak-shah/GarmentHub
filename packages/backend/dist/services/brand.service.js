"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandService = void 0;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
class BrandService {
    static async listByVendor(vendorId) {
        return db_1.prisma.brand.findMany({
            where: { vendorId },
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' },
        });
    }
    static async listAll() {
        return db_1.prisma.brand.findMany({
            include: { vendor: { select: { id: true, name: true, businessName: true } } },
            orderBy: { name: 'asc' },
        });
    }
    static async create(vendorId, data) {
        const existing = await db_1.prisma.brand.findUnique({
            where: { vendorId_name: { vendorId, name: data.name } },
        });
        if (existing)
            throw new errors_1.AppError(409, 'Brand with this name already exists');
        return db_1.prisma.brand.create({
            data: { ...data, vendorId },
            include: { _count: { select: { products: true } } },
        });
    }
    static async update(id, vendorId, data) {
        const brand = await db_1.prisma.brand.findUnique({ where: { id } });
        if (!brand)
            throw new errors_1.NotFoundError('Brand');
        if (brand.vendorId !== vendorId)
            throw new errors_1.ForbiddenError('Not your brand');
        return db_1.prisma.brand.update({
            where: { id },
            data,
            include: { _count: { select: { products: true } } },
        });
    }
    static async delete(id, vendorId) {
        const brand = await db_1.prisma.brand.findUnique({
            where: { id },
            include: { _count: { select: { products: true } } },
        });
        if (!brand)
            throw new errors_1.NotFoundError('Brand');
        if (brand.vendorId !== vendorId)
            throw new errors_1.ForbiddenError('Not your brand');
        if (brand._count.products > 0) {
            throw new errors_1.AppError(400, `Cannot delete brand with ${brand._count.products} product(s). Remove or reassign products first.`);
        }
        await db_1.prisma.brand.delete({ where: { id } });
        return { deleted: true };
    }
}
exports.BrandService = BrandService;
//# sourceMappingURL=brand.service.js.map