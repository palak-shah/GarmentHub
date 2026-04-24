"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
const notification_service_1 = require("./notification.service");
const order_service_1 = require("./order.service");
const client_1 = require("@prisma/client");
class VendorService {
    static async respondToItem(itemId, vendorId, data) {
        const item = await db_1.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: { order: true, product: { select: { name: true } } },
        });
        if (!item)
            throw new errors_1.NotFoundError('Order item');
        if (item.vendorId !== vendorId)
            throw new errors_1.ForbiddenError('Not your order item');
        if (item.status !== client_1.ItemStatus.PENDING)
            throw new errors_1.AppError(400, 'Item already responded to');
        let status;
        let acceptedQty = null;
        switch (data.action) {
            case 'ACCEPT':
                status = client_1.ItemStatus.ACCEPTED;
                acceptedQty = item.requestedQty;
                break;
            case 'REJECT':
                status = client_1.ItemStatus.REJECTED;
                break;
            case 'ALTER':
                status = client_1.ItemStatus.ALTERED;
                acceptedQty = data.alteredQty;
                break;
        }
        const updated = await db_1.prisma.orderItem.update({
            where: { id: itemId },
            data: { status, acceptedQty, vendorNote: data.note, respondedAt: new Date() },
        });
        const allItems = await db_1.prisma.orderItem.findMany({ where: { orderId: item.orderId } });
        const newOrderStatus = order_service_1.OrderService.recalculateOrderStatus(allItems);
        await db_1.prisma.order.update({ where: { id: item.orderId }, data: { status: newOrderStatus } });
        await notification_service_1.NotificationService.create(item.order.customerId, 'VENDOR_RESPONSE', 'Vendor Responded', `Vendor responded to ${item.product.name}: ${data.action}`, item.orderId);
        return updated;
    }
}
exports.VendorService = VendorService;
//# sourceMappingURL=vendor.service.js.map