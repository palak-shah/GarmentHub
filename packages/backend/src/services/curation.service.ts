import { prisma } from '../config/db';
import { NotificationService } from './notification.service';
import { Prisma, WorkflowState, OrderMode } from '@prisma/client';
import { AppError } from '../utils/errors';
import type { CuratedShareLineInput } from '../dto/curation.dto';

export class CurationService {
  static async createShare(
    traderId: string,
    lines: CuratedShareLineInput[],
    customerIds: string[],
    note?: string,
    orderMode: 'DIRECT' | 'MANAGED' = 'DIRECT',
  ) {
    if (lines.length === 0) throw new AppError(400, 'Select at least one product');
    if (customerIds.length === 0) throw new AppError(400, 'Select at least one customer');

    const uniqueCustomerIds = [...new Set(customerIds)];

    const dedupedByProduct = new Map<string, CuratedShareLineInput>();
    for (const line of lines) {
      dedupedByProduct.set(line.productId, line);
    }
    const uniqueLines = [...dedupedByProduct.values()];

    const productIds = uniqueLines.map((l) => l.productId);

    const activeCount = await prisma.product.count({
      where: { id: { in: productIds }, status: 'ACTIVE' },
    });
    if (activeCount !== productIds.length) {
      throw new AppError(400, 'One or more products are missing or not active');
    }

    const recipientCount = await prisma.user.count({
      where: { id: { in: uniqueCustomerIds }, isActive: true },
    });
    if (recipientCount !== uniqueCustomerIds.length) {
      throw new AppError(400, 'One or more recipients are invalid or inactive');
    }

    const followerLinks = await prisma.connection.findMany({
      where: { followingId: traderId, followerId: { in: uniqueCustomerIds } },
      select: { followerId: true },
    });
    const allowedRecipients = new Set(followerLinks.map((l) => l.followerId));
    if (allowedRecipients.size !== uniqueCustomerIds.length) {
      throw new AppError(
        400,
        'You can only share with people who follow you. Refresh the customer list and try again.',
      );
    }

    let share;
    try {
      share = await prisma.curatedShare.create({
        data: {
          traderId,
          note,
          orderMode: orderMode as OrderMode,
          products: {
            create: uniqueLines.map(({ productId, traderOfferUnitPrice }) => ({
              productId,
              traderOfferUnitPrice:
                traderOfferUnitPrice != null && Number.isFinite(traderOfferUnitPrice)
                  ? traderOfferUnitPrice
                  : null,
            })),
          },
          recipients: {
            create: uniqueCustomerIds.map((customerId) => ({ customerId })),
          },
        },
        include: {
          products: { include: { product: { select: { id: true, name: true, images: true } } } },
          recipients: { include: { customer: { select: { id: true, name: true } } } },
        },
      });
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (e instanceof Prisma.PrismaClientKnownRequestError || code) {
        if (code === 'P2003') {
          throw new AppError(400, 'Invalid product or customer reference');
        }
        if (code === 'P2002') {
          throw new AppError(409, 'This share could not be created due to a duplicate entry. Try again.');
        }
        if (code === 'P2021' || code === 'P2022') {
          throw new AppError(
            500,
            'Database is missing tables or columns. Run: npx prisma migrate deploy && npx prisma generate (from packages/backend), then restart the API.',
          );
        }
      }
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[CurationService] curatedShare.create failed:', e);
      if (
        msg.includes('traderOfferUnitPrice') ||
        msg.includes('does not exist') ||
        /column .* does not exist/i.test(msg)
      ) {
        throw new AppError(
          500,
          'Database is missing curated share price column. Run: npx prisma migrate deploy && npx prisma generate (from packages/backend), then restart the API.',
        );
      }
      throw e;
    }

    const { WorkflowService } = await import('./workflow.service');
    try {
      await WorkflowService.markBulkState(traderId, productIds, WorkflowState.SHARED);
    } catch (e) {
      console.error('[CurationService] markBulkState after share:', e);
    }

    const trader = await prisma.user.findUnique({
      where: { id: traderId },
      select: { name: true, businessName: true },
    });
    const traderName = trader?.businessName || trader?.name || 'A trader';

    try {
      await Promise.all(
        uniqueCustomerIds.map((cId) =>
          NotificationService.create(
            cId,
            'CURATED_SHARE',
            'New products shared',
            `${traderName} shared ${productIds.length} product${productIds.length > 1 ? 's' : ''} with you`,
            share.id,
          ),
        ),
      );
    } catch (e) {
      console.error('[CurationService] notifications after share:', e);
    }

    return share;
  }

  static async listSentByTrader(traderId: string) {
    return prisma.curatedShare.findMany({
      where: { traderId },
      include: {
        products: { include: { product: { select: { id: true, name: true, images: true, price: true } } } },
        recipients: { include: { customer: { select: { id: true, name: true, businessName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async listReceivedByCustomer(customerId: string) {
    const recipients = await prisma.curatedShareRecipient.findMany({
      where: { customerId },
      include: {
        curatedShare: {
          include: {
            trader: { select: { id: true, name: true, businessName: true } },
            products: {
              include: {
                product: {
                  select: {
                    id: true, name: true, images: true, price: true, moq: true,
                    category: { select: { id: true, name: true } },
                    vendor: { select: { id: true, name: true, businessName: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { curatedShare: { createdAt: 'desc' } },
      take: 50,
    });

    return recipients.map((r) => ({
      id: r.curatedShareId,
      isRead: r.isRead,
      trader: r.curatedShare.trader,
      note: r.curatedShare.note,
      orderMode: r.curatedShare.orderMode,
      createdAt: r.curatedShare.createdAt,
      products: r.curatedShare.products.map((p) => ({
        ...p.product,
        traderOfferUnitPrice: p.traderOfferUnitPrice,
      })),
    }));
  }

  static async markShareRead(curatedShareId: string, customerId: string) {
    await prisma.curatedShareRecipient.updateMany({
      where: { curatedShareId, customerId },
      data: { isRead: true },
    });
  }

  static async getTraderCustomers(traderId: string) {
    const connections = await prisma.connection.findMany({
      where: { followingId: traderId },
      include: {
        follower: {
          select: { id: true, name: true, businessName: true, role: true, isActive: true },
        },
      },
    });
    return connections
      .filter(
        (c) =>
          c.follower.isActive &&
          (c.follower.role === 'CUSTOMER' || c.follower.role === 'TRADER'),
      )
      .map((c) => {
        const { id, name, businessName, role } = c.follower;
        return { id, name, businessName, role };
      });
  }
}
