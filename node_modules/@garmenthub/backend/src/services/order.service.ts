import { prisma } from '../config/db';
import {
  CreateOrderDto,
  ModifyOrderItemsDto,
  TraderAdjustOrderDto,
  customerNeedByYmdToEndOfUtcDay,
} from '../dto/order.dto';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { NotificationService } from './notification.service';
import { OrderStatus, ItemStatus, OrderMode, WorkflowState } from '@prisma/client';

export class OrderService {
  /** Latest curated-share line per product (trader offer) for this buyer + trader. */
  private static async traderTargetsFromCuratedShares(
    customerId: string,
    traderId: string,
    productIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (productIds.length === 0) return map;

    const rows = await prisma.curatedShareProduct.findMany({
      where: {
        productId: { in: productIds },
        traderOfferUnitPrice: { not: null },
        curatedShare: {
          traderId,
          recipients: { some: { customerId } },
        },
      },
      select: {
        productId: true,
        traderOfferUnitPrice: true,
        curatedShare: { select: { createdAt: true } },
      },
    });

    const best = new Map<string, { price: number; at: number }>();
    for (const r of rows) {
      if (r.traderOfferUnitPrice == null) continue;
      const t = r.curatedShare.createdAt.getTime();
      const prev = best.get(r.productId);
      if (!prev || t > prev.at) {
        best.set(r.productId, { price: r.traderOfferUnitPrice, at: t });
      }
    }
    for (const [pid, v] of best) map.set(pid, v.price);
    return map;
  }

  static async create(customerId: string, data: CreateOrderDto) {
    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) }, status: 'ACTIVE' },
    });

    if (products.length !== data.items.length) {
      throw new AppError(400, 'One or more products not found or inactive');
    }

    // Prefer explicit trader (e.g. curated share); else first followed trader.
    let traderId: string | null = data.traderId ?? null;
    if (traderId) {
      const traderOk = await prisma.user.findFirst({
        where: { id: traderId, role: 'TRADER', isActive: true },
        select: { id: true },
      });
      if (!traderOk) throw new AppError(400, 'Invalid or inactive trader');
    } else {
      const traderConnection = await prisma.connection.findFirst({
        where: { followerId: customerId, following: { role: 'TRADER' } },
        select: { followingId: true },
      });
      traderId = traderConnection?.followingId ?? null;
    }

    const wantsManaged = data.orderMode === 'MANAGED';
    // Managed flow only when a trader is linked; otherwise checkout as direct (vendors notified).
    const isManaged = wantsManaged && traderId != null;

    const favoredByProduct =
      traderId != null
        ? await this.traderTargetsFromCuratedShares(
            customerId,
            traderId,
            data.items.map((i) => i.productId),
          )
        : new Map<string, number>();

    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const favored = favoredByProduct.get(item.productId);
      return {
        productId: item.productId,
        vendorId: product.vendorId,
        requestedQty: item.quantity,
        status: ItemStatus.PENDING,
        ...(favored != null ? { traderTargetUnitPrice: favored } : {}),
      };
    });

    const releasedToVendorsAt = isManaged ? null : new Date();

    const customerNeedBy = data.customerNeedBy
      ? customerNeedByYmdToEndOfUtcDay(data.customerNeedBy)
      : undefined;

    const order = await prisma.order.create({
      data: {
        customerId,
        traderId,
        orderMode: isManaged ? OrderMode.MANAGED : OrderMode.DIRECT,
        note: data.note,
        status: OrderStatus.PENDING,
        releasedToVendorsAt,
        ...(customerNeedBy != null ? { customerNeedBy } : {}),
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: true, vendor: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true, businessName: true } },
      },
    });

    try {
      if (releasedToVendorsAt) {
        const vendorIds = [...new Set(orderItems.map((i) => i.vendorId))];
        await Promise.all(
          vendorIds.map((vId) =>
            NotificationService.create(
              vId,
              'ORDER_PLACED',
              'New Order Received',
              `New order #${order.id.slice(-6)} from ${order.customer.businessName || order.customer.name}`,
              order.id,
            ),
          ),
        );
      }

      if (traderId) {
        const modeLabel = order.orderMode === 'DIRECT' ? 'direct' : 'managed';
        await NotificationService.create(
          traderId,
          'ORDER_PLACED',
          'Customer placed order',
          `${modeLabel} order #${order.id.slice(-6)} by ${order.customer.businessName || order.customer.name}`,
          order.id,
        );
      }
    } catch (e) {
      console.error('[OrderService] create notifications:', e);
    }

    const { WorkflowService } = await import('./workflow.service');
    try {
      await WorkflowService.markBulkState(
        customerId,
        data.items.map((i) => i.productId),
        WorkflowState.ORDERED,
      );
    } catch (e) {
      console.error('[OrderService] create markBulkState:', e);
    }

    return order;
  }

  static async listForCustomer(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        trader: { select: { id: true, name: true, businessName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, price: true, priceMax: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async listForTrader(traderId: string) {
    return prisma.order.findMany({
      where: { traderId },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, price: true, priceMax: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async listForVendor(vendorId: string) {
    const items = await prisma.orderItem.findMany({
      where: {
        vendorId,
        order: { releasedToVendorsAt: { not: null } },
      },
      include: {
        product: { select: { id: true, name: true, images: true, price: true, priceMax: true } },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            orderMode: true,
            customerNeedBy: true,
            customer: { select: { id: true, name: true, businessName: true } },
            trader: { select: { id: true, name: true, businessName: true } },
          },
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
            product: { select: { id: true, name: true, images: true, price: true, priceMax: true, moq: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
          },
        },
        customer: { select: { id: true, name: true, businessName: true, phone: true } },
        trader: { select: { id: true, name: true, businessName: true } },
      },
    });
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  static async setTraderCounterPrice(itemId: string, traderId: string, unitPrice: number) {
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true, product: { select: { name: true } } },
    });
    if (!item) throw new NotFoundError('Order item');
    if (item.order.traderId !== traderId) throw new ForbiddenError('Not your order');
    if (item.order.orderMode !== OrderMode.MANAGED) {
      throw new AppError(400, 'Price negotiation only on managed orders');
    }
    if (item.status !== ItemStatus.ALTERED) throw new AppError(400, 'Can only counter price on altered lines');
    if (item.agreedUnitPrice != null) throw new AppError(400, 'Price already agreed for this line');

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { traderCounterUnitPrice: unitPrice },
    });

    await NotificationService.create(
      item.vendorId,
      'TRADER_PRICE_COUNTER',
      'Trader suggested a price',
      `Counter offer on ${item.product.name}: ${unitPrice}/unit (order #${item.orderId.slice(-6)})`,
      item.orderId,
    );

    return updated;
  }

  static async confirmOrder(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundError('Order');
    if (order.customerId !== customerId) throw new AppError(403, 'Not your order');
    if (order.status === OrderStatus.CONFIRMED) throw new AppError(400, 'Order already confirmed');
    if (order.status === OrderStatus.CANCELLED) throw new AppError(400, 'Order was cancelled');

    const hasAltered = order.items.some((i) => i.status === ItemStatus.ALTERED);
    if (hasAltered) {
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

    if (order.items.some((i) => i.status === ItemStatus.PENDING)) {
      throw new AppError(400, 'Still waiting for vendors on some lines');
    }

    const toFinalize = order.items.filter((i) => i.status === ItemStatus.ACCEPTED);
    if (toFinalize.length === 0) {
      throw new AppError(400, 'Nothing to confirm yet');
    }

    await prisma.$transaction([
      prisma.orderItem.updateMany({
        where: { orderId, status: ItemStatus.ACCEPTED },
        data: { status: ItemStatus.CONFIRMED },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
      }),
    ]);

    return this.getById(orderId);
  }

  static async modifyOrderItems(orderId: string, customerId: string, data: ModifyOrderItemsDto) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError('Order');
    if (order.customerId !== customerId) throw new ForbiddenError('Not your order');
    if (order.status === OrderStatus.CONFIRMED) throw new AppError(400, 'Cannot modify a confirmed order');
    if (order.status === OrderStatus.CANCELLED) throw new AppError(400, 'Cannot modify a cancelled order');

    const unreleasedManaged = order.orderMode === OrderMode.MANAGED && !order.releasedToVendorsAt;

    const byId = new Map(order.items.map((i) => [i.id, i]));
    const vendorNotify = new Set<string>();

    const ops: Parameters<typeof prisma.$transaction>[0] = [];
    for (const row of data.items) {
      const item = byId.get(row.itemId);
      if (!item) throw new AppError(400, 'Invalid line item');
      if (item.requestedQty === row.requestedQty) continue;
      if (unreleasedManaged) {
        ops.push(
          prisma.orderItem.update({
            where: { id: row.itemId },
            data: { requestedQty: row.requestedQty },
          }),
        );
      } else {
        vendorNotify.add(item.vendorId);
        ops.push(
          prisma.orderItem.update({
            where: { id: row.itemId },
            data: {
              requestedQty: row.requestedQty,
              status: ItemStatus.PENDING,
              acceptedQty: null,
              vendorNote: null,
              respondedAt: null,
              offeredUnitPrice: null,
              traderCounterUnitPrice: null,
              traderTargetUnitPrice: null,
              agreedUnitPrice: null,
            },
          }),
        );
      }
    }

    if (ops.length === 0) throw new AppError(400, 'No quantity changes');

    await prisma.$transaction(ops);

    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const newStatus = this.recalculateOrderStatus(allItems);
    await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });

    const refreshed = await this.getById(orderId);
    if (!unreleasedManaged) {
      for (const vId of vendorNotify) {
        await NotificationService.create(
          vId,
          'ORDER_MODIFIED',
          'Order updated by buyer',
          `Buyer revised quantities on order #${orderId.slice(-6)} — please review`,
          orderId,
        );
      }
    }
    if (order.traderId) {
      await NotificationService.create(
        order.traderId,
        'ORDER_MODIFIED',
        'Order updated',
        unreleasedManaged
          ? `Customer revised order #${orderId.slice(-6)} before vendor send`
          : `Customer revised order #${orderId.slice(-6)}`,
        orderId,
      );
    }

    return refreshed;
  }

  static async releaseOrderToVendors(orderId: string, traderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: { select: { businessName: true, name: true } } },
    });
    if (!order) throw new NotFoundError('Order');
    if (order.traderId !== traderId) throw new ForbiddenError('Not your order');
    if (order.orderMode !== OrderMode.MANAGED) throw new AppError(400, 'Only managed orders are released by the trader');
    if (order.releasedToVendorsAt) throw new AppError(400, 'Already sent to vendors');
    if (order.status === OrderStatus.CANCELLED) throw new AppError(400, 'Order was cancelled');

    await prisma.order.update({
      where: { id: orderId },
      data: { releasedToVendorsAt: new Date() },
    });

    const vendorIds = [...new Set(order.items.map((i) => i.vendorId))];
    const cust = order.customer.businessName || order.customer.name;
    await Promise.all(
      vendorIds.map((vId) =>
        NotificationService.create(
          vId,
          'ORDER_PLACED',
          'New Order Received',
          `New order #${order.id.slice(-6)} from ${cust}`,
          order.id,
        ),
      ),
    );

    await NotificationService.create(
      order.customerId,
      'ORDER_PLACED',
      'Order sent to vendors',
      `Your trader sent order #${order.id.slice(-6)} to vendors`,
      order.id,
    );

    return this.getById(orderId);
  }

  static async traderAdjustOrder(orderId: string, traderId: string, data: TraderAdjustOrderDto) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: { select: { id: true, businessName: true, name: true } } },
    });
    if (!order) throw new NotFoundError('Order');
    if (order.traderId !== traderId) throw new ForbiddenError('Not your order');
    if (order.status === OrderStatus.CONFIRMED) throw new AppError(400, 'Cannot modify a confirmed order');
    if (order.status === OrderStatus.CANCELLED) throw new AppError(400, 'Cannot modify a cancelled order');

    const unreleasedManaged = order.orderMode === OrderMode.MANAGED && !order.releasedToVendorsAt;
    const allLinesPending = order.items.every((i) => i.status === ItemStatus.PENDING);
    if (!unreleasedManaged) {
      if (!allLinesPending) throw new AppError(400, 'Cannot modify after a vendor has responded');
    }

    /** Trader's favored unit price: managed internal review, or while every line is still PENDING (e.g. direct). */
    const canEditTraderOfferUnitPrice =
      unreleasedManaged || (order.items.length > 0 && allLinesPending);

    const byId = new Map(order.items.map((i) => [i.id, i]));
    const vendorNotify = new Set<string>();

    const priceUnequal = (a: number | null | undefined, b: number | null | undefined) => {
      const na = a == null ? null : a;
      const nb = b == null ? null : b;
      if (na === null && nb === null) return false;
      if (na === null || nb === null) return true;
      return Math.abs(na - nb) > 1e-9;
    };

    for (const row of data.items ?? []) {
      if (row.unitPrice !== undefined && !canEditTraderOfferUnitPrice) {
        throw new AppError(400, 'Unit price cannot be changed in the current order state');
      }
    }

    let lineChangeCount = 0;
    let targetPriceChangeCount = 0;
    for (const row of data.items ?? []) {
      const item = byId.get(row.itemId);
      if (!item) throw new AppError(400, 'Invalid line item');
      if (row.requestedQty !== undefined && item.requestedQty !== row.requestedQty) {
        lineChangeCount += 1;
        if (!unreleasedManaged) vendorNotify.add(item.vendorId);
      }
      if (
        canEditTraderOfferUnitPrice &&
        row.unitPrice !== undefined &&
        priceUnequal(item.traderTargetUnitPrice, row.unitPrice === null ? null : row.unitPrice)
      ) {
        targetPriceChangeCount += 1;
      }
    }

    const normNote = (v: string | null | undefined) => (v ?? '').trim();
    const noteChanged =
      data.note !== undefined && normNote(data.note) !== normNote(order.note);

    if (lineChangeCount === 0 && targetPriceChangeCount === 0 && !noteChanged) {
      throw new AppError(400, 'No changes');
    }

    await prisma.$transaction(async (tx) => {
      for (const row of data.items ?? []) {
        const item = byId.get(row.itemId)!;
        const qtyChange = row.requestedQty !== undefined && row.requestedQty !== item.requestedQty;
        const priceChange =
          canEditTraderOfferUnitPrice &&
          row.unitPrice !== undefined &&
          priceUnequal(item.traderTargetUnitPrice, row.unitPrice === null ? null : row.unitPrice);

        if (!qtyChange && !priceChange) continue;

        if (qtyChange) {
          if (unreleasedManaged) {
            await tx.orderItem.update({
              where: { id: row.itemId },
              data: {
                requestedQty: row.requestedQty!,
                ...(priceChange
                  ? { traderTargetUnitPrice: row.unitPrice === null ? null : row.unitPrice }
                  : {}),
              },
            });
          } else {
            await tx.orderItem.update({
              where: { id: row.itemId },
              data: {
                requestedQty: row.requestedQty!,
                status: ItemStatus.PENDING,
                acceptedQty: null,
                vendorNote: null,
                respondedAt: null,
                offeredUnitPrice: null,
                traderCounterUnitPrice: null,
                ...(row.unitPrice !== undefined
                  ? {
                      traderTargetUnitPrice: row.unitPrice === null ? null : row.unitPrice,
                    }
                  : {}),
                agreedUnitPrice: null,
              },
            });
          }
        } else if (priceChange) {
          await tx.orderItem.update({
            where: { id: row.itemId },
            data: { traderTargetUnitPrice: row.unitPrice === null ? null : row.unitPrice },
          });
        }
      }
      if (noteChanged) {
        await tx.order.update({ where: { id: orderId }, data: { note: data.note } });
      }
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const newStatus = this.recalculateOrderStatus(allItems);
      await tx.order.update({ where: { id: orderId }, data: { status: newStatus } });
    });

    const refreshed = await this.getById(orderId);

    try {
      if (!unreleasedManaged && vendorNotify.size > 0) {
        for (const vId of vendorNotify) {
          await NotificationService.create(
            vId,
            'ORDER_MODIFIED',
            'Order updated by trader',
            `Trader revised order #${orderId.slice(-6)} — please review`,
            orderId,
          );
        }
      }

      await NotificationService.create(
        order.customerId,
        'ORDER_MODIFIED',
        'Order updated',
        `Your trader updated order #${orderId.slice(-6)}`,
        orderId,
      );
    } catch (e) {
      console.error('[OrderService] traderAdjustOrder notifications:', e);
    }

    return refreshed;
  }

  static async cancelOrder(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { vendorId: true } } },
    });
    if (!order) throw new NotFoundError('Order');
    if (order.customerId !== customerId) throw new ForbiddenError('Not your order');
    if (order.status === OrderStatus.CONFIRMED) throw new AppError(400, 'Cannot cancel a confirmed order');
    if (order.status === OrderStatus.CANCELLED) throw new AppError(400, 'Already cancelled');

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    if (order.releasedToVendorsAt) {
      const vendorIds = [...new Set(order.items.map((i) => i.vendorId))];
      await Promise.all(
        vendorIds.map((vId) =>
          NotificationService.create(
            vId,
            'ORDER_CANCELLED',
            'Order cancelled',
            `Order #${orderId.slice(-6)} was cancelled by the buyer`,
            orderId,
          ),
        ),
      );
    }
    if (order.traderId) {
      await NotificationService.create(
        order.traderId,
        'ORDER_CANCELLED',
        'Order cancelled',
        `Order #${orderId.slice(-6)} was cancelled`,
        orderId,
      );
    }

    return this.getById(orderId);
  }

  static async getTraderAlerts(traderId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        traderId,
        status: { in: [OrderStatus.PENDING, OrderStatus.PARTIALLY_ACCEPTED, OrderStatus.REJECTED] },
      },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, price: true, priceMax: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders
      .map((order) => {
        const pendingItems = order.items.filter((i) => i.status === ItemStatus.PENDING);
        const rejectedItems = order.items.filter((i) => i.status === ItemStatus.REJECTED);
        const isStale = order.createdAt < oneDayAgo && pendingItems.length > 0;
        const needsTraderRelease =
          order.orderMode === OrderMode.MANAGED && !order.releasedToVendorsAt && order.status === OrderStatus.PENDING;

        let alertType: 'stale' | 'rejected' | 'partial' | 'trader_release' | null = null;
        if (needsTraderRelease) alertType = 'trader_release';
        else if (rejectedItems.length === order.items.length) alertType = 'rejected';
        else if (rejectedItems.length > 0) alertType = 'partial';
        else if (isStale) alertType = 'stale';

        return { ...order, alertType, pendingCount: pendingItems.length, rejectedCount: rejectedItems.length };
      })
      .filter((o) => o.alertType !== null);
  }

  static async takeControl(orderId: string, traderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError('Order');
    if (order.traderId !== traderId) throw new AppError(403, 'Not your managed order');

    await prisma.order.update({
      where: { id: orderId },
      data: { orderMode: OrderMode.MANAGED },
    });

    await NotificationService.create(
      order.customerId,
      'ORDER_PLACED',
      'Trader is handling your order',
      `Your trader has taken over order #${orderId.slice(-6)}`,
      orderId,
    );

    return this.getById(orderId);
  }

  static recalculateOrderStatus(items: { status: ItemStatus }[]): OrderStatus {
    if (items.length === 0) return OrderStatus.PENDING;
    const statuses = items.map((i) => i.status);
    if (statuses.every((s) => s === ItemStatus.ACCEPTED || s === ItemStatus.CONFIRMED)) return OrderStatus.ACCEPTED;
    if (statuses.every((s) => s === ItemStatus.REJECTED)) return OrderStatus.REJECTED;
    if (statuses.some((s) => s === ItemStatus.PENDING)) return OrderStatus.PENDING;
    return OrderStatus.PARTIALLY_ACCEPTED;
  }
}
