import { prisma } from '../config/db';
import { CreateOrderDto } from '../dto/order.dto';
import { NotFoundError, AppError } from '../utils/errors';
import { NotificationService } from './notification.service';
import { OrderStatus, ItemStatus } from '@prisma/client';

export class OrderService {
  static async create(customerId: string, data: CreateOrderDto) {
    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) }, status: 'ACTIVE' },
    });

    if (products.length !== data.items.length) {
      throw new AppError(400, 'One or more products not found or inactive');
    }

    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: item.productId,
        vendorId: product.vendorId,
        requestedQty: item.quantity,
        status: ItemStatus.PENDING,
      };
    });

    const order = await prisma.order.create({
      data: {
        customerId,
        note: data.note,
        status: OrderStatus.PENDING,
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: true, vendor: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true, businessName: true } },
      },
    });

    const vendorIds = [...new Set(orderItems.map((i) => i.vendorId))];
    await Promise.all(
      vendorIds.map((vId) =>
        NotificationService.create(vId, 'ORDER_PLACED', 'New Order Received', `New order #${order.id.slice(-6)} from ${order.customer.businessName || order.customer.name}`, order.id)
      )
    );

    return order;
  }

  static async listForCustomer(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, price: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async listForVendor(vendorId: string) {
    const items = await prisma.orderItem.findMany({
      where: { vendorId },
      include: {
        product: { select: { id: true, name: true, images: true, price: true } },
        order: {
          include: { customer: { select: { id: true, name: true, businessName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  static async getById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, price: true, moq: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
          },
        },
        customer: { select: { id: true, name: true, businessName: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  static async confirmOrder(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundError('Order');
    if (order.customerId !== customerId) throw new AppError(403, 'Not your order');

    const hasAltered = order.items.some((i) => i.status === ItemStatus.ALTERED);
    if (!hasAltered) throw new AppError(400, 'No altered items to confirm');

    await prisma.$transaction([
      prisma.orderItem.updateMany({
        where: { orderId, status: ItemStatus.ALTERED },
        data: { status: ItemStatus.CONFIRMED },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
      }),
    ]);

    return this.getById(orderId);
  }

  static recalculateOrderStatus(items: { status: ItemStatus }[]): OrderStatus {
    const statuses = items.map((i) => i.status);
    if (statuses.every((s) => s === ItemStatus.ACCEPTED || s === ItemStatus.CONFIRMED)) return OrderStatus.ACCEPTED;
    if (statuses.every((s) => s === ItemStatus.REJECTED)) return OrderStatus.REJECTED;
    if (statuses.some((s) => s === ItemStatus.PENDING)) return OrderStatus.PENDING;
    return OrderStatus.PARTIALLY_ACCEPTED;
  }
}
