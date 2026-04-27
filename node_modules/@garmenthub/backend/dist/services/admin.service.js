"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
const attrOrderBy = [{ sortOrder: 'asc' }, { name: 'asc' }];
class AdminService {
    static async getUsers(role) {
        return db_1.prisma.user.findMany({
            where: role ? { role: role } : undefined,
            select: {
                id: true, phone: true, name: true, role: true,
                businessName: true, isActive: true, createdAt: true,
                _count: { select: { products: true, orders: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async toggleUserStatus(userId, isActive) {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_1.NotFoundError('User');
        return db_1.prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: { id: true, phone: true, name: true, role: true, isActive: true },
        });
    }
    static async getAllOrders() {
        return db_1.prisma.order.findMany({
            include: {
                customer: { select: { id: true, name: true, businessName: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                        vendor: { select: { id: true, name: true, businessName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async getStats() {
        const [userCount, vendorCount, customerCount, productCount, orderCount, ordersByStatus] = await Promise.all([
            db_1.prisma.user.count(),
            db_1.prisma.user.count({ where: { role: 'VENDOR' } }),
            db_1.prisma.user.count({ where: { role: 'CUSTOMER' } }),
            db_1.prisma.product.count({ where: { status: 'ACTIVE' } }),
            db_1.prisma.order.count(),
            db_1.prisma.order.groupBy({ by: ['status'], _count: true }),
        ]);
        return {
            users: { total: userCount, vendors: vendorCount, customers: customerCount },
            products: productCount,
            orders: {
                total: orderCount,
                byStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
            },
        };
    }
    static async listCategories() {
        return db_1.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { attributes: { orderBy: attrOrderBy } },
        });
    }
    static async createCategory(name, attributes) {
        return db_1.prisma.$transaction(async (tx) => {
            const category = await tx.category.create({ data: { name: name.trim() } });
            if (attributes?.length) {
                await tx.categoryAttribute.createMany({
                    data: attributes.map((a, i) => ({
                        categoryId: category.id,
                        name: a.name.trim(),
                        sortOrder: a.sortOrder ?? i,
                    })),
                });
            }
            return tx.category.findUniqueOrThrow({
                where: { id: category.id },
                include: { attributes: { orderBy: attrOrderBy } },
            });
        });
    }
    static async updateCategory(id, name) {
        const cat = await db_1.prisma.category.findUnique({ where: { id } });
        if (!cat)
            throw new errors_1.NotFoundError('Category');
        return db_1.prisma.category.update({
            where: { id },
            data: { name: name.trim() },
            include: { attributes: { orderBy: attrOrderBy } },
        });
    }
    static async deleteCategory(id) {
        const count = await db_1.prisma.product.count({ where: { categoryId: id } });
        if (count > 0) {
            throw new errors_1.ConflictError(`Cannot delete category: ${count} product(s) still use it`);
        }
        await db_1.prisma.category.delete({ where: { id } });
        return { deleted: true };
    }
    static async createCategoryAttribute(categoryId, name, sortOrder) {
        const cat = await db_1.prisma.category.findUnique({ where: { id: categoryId } });
        if (!cat)
            throw new errors_1.NotFoundError('Category');
        return db_1.prisma.categoryAttribute.create({
            data: {
                categoryId,
                name: name.trim(),
                sortOrder: sortOrder ?? 0,
            },
        });
    }
    static async updateCategoryAttribute(categoryId, attributeId, data) {
        const row = await db_1.prisma.categoryAttribute.findFirst({
            where: { id: attributeId, categoryId },
        });
        if (!row)
            throw new errors_1.NotFoundError('Attribute');
        return db_1.prisma.categoryAttribute.update({
            where: { id: attributeId },
            data: {
                ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
            },
        });
    }
    static async deleteCategoryAttribute(categoryId, attributeId) {
        const row = await db_1.prisma.categoryAttribute.findFirst({
            where: { id: attributeId, categoryId },
        });
        if (!row)
            throw new errors_1.NotFoundError('Attribute');
        await db_1.prisma.categoryAttribute.delete({ where: { id: attributeId } });
        return { deleted: true };
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map