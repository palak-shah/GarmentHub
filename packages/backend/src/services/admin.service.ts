import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';

export class AdminService {
  static async getUsers(role?: string) {
    return prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
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

  static async createCategory(name: string) {
    return prisma.category.create({ data: { name } });
  }

  static async updateCategory(id: string, name: string) {
    return prisma.category.update({ where: { id }, data: { name } });
  }

  static async deleteCategory(id: string) {
    await prisma.category.delete({ where: { id } });
    return { deleted: true };
  }
}
