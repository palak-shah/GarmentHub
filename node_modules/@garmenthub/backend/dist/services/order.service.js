"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
const notification_service_1 = require("./notification.service");
const client_1 = require("@prisma/client");
class OrderService {
    static async create(customerId, data) {
        const products = await db_1.prisma.product.findMany({
            where: { id: { in: data.items.map((i) => i.productId) }, status: 'ACTIVE' },
        });
        if (products.length !== data.items.length) {
            throw new errors_1.AppError(400, 'One or more products not found or inactive');
        }
        const orderItems = data.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
                productId: item.productId,
                vendorId: product.vendorId,
                requestedQty: item.quantity,
                status: client_1.ItemStatus.PENDING,
            };
        });
        const order = await db_1.prisma.order.create({
            data: {
                customerId,
                note: data.note,
                status: client_1.OrderStatus.PENDING,
                items: { create: orderItems },
            },
            include: {
                items: { include: { product: true, vendor: { select: { id: true, name: true } } } },
                customer: { select: { id: true, name: true, businessName: true } },
            },
        });
        const vendorIds = [...new Set(orderItems.map((i) => i.vendorId))];
        await Promise.all(vendorIds.map((vId) => notification_service_1.NotificationService.create(vId, 'ORDER_PLACED', 'New Order Received', `New order #${order.id.slice(-6)} from ${order.customer.businessName || order.customer.name}`, order.id)));
        return order;
    }
    static async listForCustomer(customerId) {
        return db_1.prisma.order.findMany({
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
    static async listForVendor(vendorId) {
        const items = await db_1.prisma.orderItem.findMany({
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
    static async getById(id) {
        const order = await db_1.prisma.order.findUnique({
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
        if (!order)
            throw new errors_1.NotFoundError('Order');
        return order;
    }
    static async confirmOrder(orderId, customerId) {
        const order = await db_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order)
            throw new errors_1.NotFoundError('Order');
        if (order.customerId !== customerId)
            throw new errors_1.AppError(403, 'Not your order');
        const hasAltered = order.items.some((i) => i.status === client_1.ItemStatus.ALTERED);
        if (!hasAltered)
            throw new errors_1.AppError(400, 'No altered items to confirm');
        await db_1.prisma.$transaction([
            db_1.prisma.orderItem.updateMany({
                where: { orderId, status: client_1.ItemStatus.ALTERED },
                data: { status: client_1.ItemStatus.CONFIRMED },
            }),
            db_1.prisma.order.update({
                where: { id: orderId },
                data: { status: client_1.OrderStatus.CONFIRMED },
            }),
        ]);
        return this.getById(orderId);
    }
    static recalculateOrderStatus(items) {
        const statuses = items.map((i) => i.status);
        if (statuses.every((s) => s === client_1.ItemStatus.ACCEPTED || s === client_1.ItemStatus.CONFIRMED))
            return client_1.OrderStatus.ACCEPTED;
        if (statuses.every((s) => s === client_1.ItemStatus.REJECTED))
            return client_1.OrderStatus.REJECTED;
        if (statuses.some((s) => s === client_1.ItemStatus.PENDING))
            return client_1.OrderStatus.PENDING;
        return client_1.OrderStatus.PARTIALLY_ACCEPTED;
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map