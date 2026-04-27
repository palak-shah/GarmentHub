import { prisma } from '../config/db';
import { VendorResponseDto, VendorPriceCounterResponseDto, VendorBulkRespondDto } from '../dto/vendor.dto';
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
    let offeredUnitPrice: number | null | undefined = undefined;
    let traderCounterUnitPrice: number | null | undefined = undefined;
    let agreedUnitPrice: number | null | undefined = undefined;

    switch (data.action) {
      case 'ACCEPT':
        status = ItemStatus.ACCEPTED;
        acceptedQty = item.requestedQty;
        offeredUnitPrice = data.offeredUnitPrice ?? null;
        traderCounterUnitPrice = null;
        agreedUnitPrice = null;
        break;
      case 'REJECT':
        status = ItemStatus.REJECTED;
        offeredUnitPrice = null;
        traderCounterUnitPrice = null;
        agreedUnitPrice = null;
        break;
      case 'ALTER': {
        const q = data.alteredQty!;
        status = ItemStatus.ALTERED;
        acceptedQty = q;
        offeredUnitPrice = data.offeredUnitPrice ?? null;
        traderCounterUnitPrice = null;
        agreedUnitPrice = null;
        break;
      }
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        acceptedQty,
        vendorNote: data.note,
        respondedAt: new Date(),
        ...(offeredUnitPrice !== undefined ? { offeredUnitPrice } : {}),
        ...(traderCounterUnitPrice !== undefined ? { traderCounterUnitPrice } : {}),
        ...(agreedUnitPrice !== undefined ? { agreedUnitPrice } : {}),
      },
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

    // Notify trader if one is associated with this order
    if (item.order.traderId && item.order.traderId !== vendorId) {
      await NotificationService.create(
        item.order.traderId,
        'VENDOR_RESPONSE',
        'Vendor Responded',
        `Vendor responded to ${item.product.name}: ${data.action} on order #${item.orderId.slice(-6)}`,
        item.orderId,
      );
    }

    return updated;
  }

  static async bulkRespondToItems(vendorId: string, data: VendorBulkRespondDto) {
    const results = [];
    for (const r of data.responses) {
      const row = await this.respondToItem(r.itemId, vendorId, {
        action: r.action,
        alteredQty: r.alteredQty,
        offeredUnitPrice: r.offeredUnitPrice,
        note: r.note,
      });
      results.push(row);
    }
    return { updated: results.length };
  }

  static async respondToTraderPrice(itemId: string, vendorId: string, data: VendorPriceCounterResponseDto) {
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true, product: { select: { name: true } } },
    });

    if (!item) throw new NotFoundError('Order item');
    if (item.vendorId !== vendorId) throw new ForbiddenError('Not your order item');
    if (item.status !== ItemStatus.ALTERED) throw new AppError(400, 'Price response only for altered lines');
    if (item.traderCounterUnitPrice == null) throw new AppError(400, 'No trader price counter to respond to');

    if (data.action === 'ACCEPT') {
      const updated = await prisma.orderItem.update({
        where: { id: itemId },
        data: {
          agreedUnitPrice: item.traderCounterUnitPrice,
          traderCounterUnitPrice: null,
        },
      });

      if (item.order.traderId) {
        await NotificationService.create(
          item.order.traderId,
          'PRICE_AGREED',
          'Price accepted',
          `Vendor accepted your price on ${item.product.name} (order #${item.orderId.slice(-6)})`,
          item.orderId,
        );
      }

      return updated;
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { traderCounterUnitPrice: null },
    });

    if (item.order.traderId) {
      await NotificationService.create(
        item.order.traderId,
        'PRICE_DECLINED',
        'Price counter declined',
        `Vendor declined your price on ${item.product.name} (order #${item.orderId.slice(-6)})`,
        item.orderId,
      );
    }

    return updated;
  }
}
