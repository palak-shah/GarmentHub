import { prisma } from '../config/db';
import { VendorResponseDto } from '../dto/vendor.dto';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { NotificationService } from './notification.service';
import { OrderService } from './order.service';
import { ItemStatus } from '@prisma/client';

export class VendorService {
  static async respondToItem(itemId: string, vendorId: string, data: VendorResponseDto) {
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true, product: { select: { name: true } } },
    });

    if (!item) throw new NotFoundError('Order item');
    if (item.vendorId !== vendorId) throw new ForbiddenError('Not your order item');
    if (item.status !== ItemStatus.PENDING) throw new AppError(400, 'Item already responded to');

    let status: ItemStatus;
    let acceptedQty: number | null = null;

    switch (data.action) {
      case 'ACCEPT':
        status = ItemStatus.ACCEPTED;
        acceptedQty = item.requestedQty;
        break;
      case 'REJECT':
        status = ItemStatus.REJECTED;
        break;
      case 'ALTER':
        status = ItemStatus.ALTERED;
        acceptedQty = data.alteredQty!;
        break;
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status, acceptedQty, vendorNote: data.note, respondedAt: new Date() },
    });

    const allItems = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
    const newOrderStatus = OrderService.recalculateOrderStatus(allItems);
    await prisma.order.update({ where: { id: item.orderId }, data: { status: newOrderStatus } });

    await NotificationService.create(
      item.order.customerId,
      'VENDOR_RESPONSE',
      'Vendor Responded',
      `Vendor responded to ${item.product.name}: ${data.action}`,
      item.orderId,
    );

    return updated;
  }
}
