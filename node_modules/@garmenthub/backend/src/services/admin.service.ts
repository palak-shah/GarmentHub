import { prisma } from '../config/db';
import { ConflictError, NotFoundError } from '../utils/errors';

const attrOrderBy = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

export class AdminService {
  static async getUsers(role?: string) {
    return prisma.user.findMany({
      where: role ? { role: role as 'CUSTOMER' | 'VENDOR' | 'ADMIN' } : undefined,
      select: {
        id: true, phone: true, name: true, role: true,
        businessName: true, isActive: true, createdAt: true,
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, phone: true, name: true, role: true, isActive: true },
    });
  }

  static async getAllOrders() {
    return prisma.order.findMany({
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
      prisma.user.count(),
      prisma.user.count({ where: { role: 'VENDOR' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.groupBy({ by: ['status'], _count: true }),
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
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { attributes: { orderBy: attrOrderBy } },
    });
  }

  static async createCategory(name: string, attributes?: { name: string; sortOrder?: number }[]) {
    return prisma.$transaction(async (tx) => {
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

  static async updateCategory(id: string, name: string) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundError('Category');
    return prisma.category.update({
      where: { id },
      data: { name: name.trim() },
      include: { attributes: { orderBy: attrOrderBy } },
    });
  }

  static async deleteCategory(id: string) {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new ConflictError(`Cannot delete category: ${count} product(s) still use it`);
    }
    await prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  static async createCategoryAttribute(categoryId: string, name: string, sortOrder?: number) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundError('Category');
    return prisma.categoryAttribute.create({
      data: {
        categoryId,
        name: name.trim(),
        sortOrder: sortOrder ?? 0,
      },
    });
  }

  static async updateCategoryAttribute(
    categoryId: string,
    attributeId: string,
    data: { name?: string; sortOrder?: number },
  ) {
    const row = await prisma.categoryAttribute.findFirst({
      where: { id: attributeId, categoryId },
    });
    if (!row) throw new NotFoundError('Attribute');
    return prisma.categoryAttribute.update({
      where: { id: attributeId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  }

  static async deleteCategoryAttribute(categoryId: string, attributeId: string) {
    const row = await prisma.categoryAttribute.findFirst({
      where: { id: attributeId, categoryId },
    });
    if (!row) throw new NotFoundError('Attribute');
    await prisma.categoryAttribute.delete({ where: { id: attributeId } });
    return { deleted: true };
  }
}
