import { prisma } from '../config/db';
import { NotificationService } from './notification.service';
import { Prisma, WorkflowState, OrderMode } from '@prisma/client';
import { AppError, NotFoundError } from '../utils/errors';
import type { CuratedShareLineInput } from '../dto/curation.dto';

export class CurationService {
  private static async resolveGroupRecipientIds(traderId: string, groupIds: string[]) {
    if (groupIds.length === 0) return [];
    const uniqueGroupIds = [...new Set(groupIds)];
    const groups = await prisma.customerGroup.findMany({
      where: { traderId, id: { in: uniqueGroupIds } },
      include: { members: { select: { customerId: true } } },
    });
    if (groups.length !== uniqueGroupIds.length) {
      throw new AppError(400, 'One or more customer groups are invalid');
    }
    return [...new Set(groups.flatMap((g) => g.members.map((m) => m.customerId)))];
  }

  private static async assertCustomersFollowTrader(traderId: string, customerIds: string[]) {
    if (customerIds.length === 0) return;
    const followerLinks = await prisma.connection.findMany({
      where: { followingId: traderId, followerId: { in: customerIds } },
      select: { followerId: true },
    });
    const allowed = new Set(followerLinks.map((l) => l.followerId));
    if (allowed.size !== customerIds.length) {
      throw new AppError(
        400,
        'You can only share with people who follow you. Refresh the customer list and try again.',
      );
    }
  }

  static async createShare(
    traderId: string,
    lines: CuratedShareLineInput[],
    customerIds: string[],
    customerGroupIds: string[] = [],
    note?: string,
    orderMode: 'DIRECT' | 'MANAGED' = 'DIRECT',
  ) {
    if (lines.length === 0) throw new AppError(400, 'Select at least one product');

    const fromGroups = await this.resolveGroupRecipientIds(traderId, customerGroupIds);
    const uniqueCustomerIds = [...new Set([...customerIds, ...fromGroups])];

    if (uniqueCustomerIds.length === 0) {
      throw new AppError(400, 'Select at least one customer or a non-empty customer group');
    }

    const deduped = new Map<string, CuratedShareLineInput>();
    for (const line of lines) {
      const key = `${line.productId}:${line.productImageId ?? ''}`;
      deduped.set(key, line);
    }
    const uniqueLines = [...deduped.values()];

    const productIds = [...new Set(uniqueLines.map((l) => l.productId))];

    for (const line of uniqueLines) {
      if (line.productImageId) {
        const img = await prisma.productImage.findFirst({
          where: { id: line.productImageId, productId: line.productId },
        });
        if (!img) throw new AppError(400, 'One or more selected photos are invalid for this product');
      }
    }

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

    await this.assertCustomersFollowTrader(traderId, uniqueCustomerIds);

    let share;
    try {
      share = await prisma.curatedShare.create({
        data: {
          traderId,
          note,
          orderMode: orderMode as OrderMode,
          products: {
            create: uniqueLines.map(({ productId, traderOfferUnitPrice, productImageId }) => ({
              productId,
              productImageId: productImageId ?? null,
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
          const target =
            e instanceof Prisma.PrismaClientKnownRequestError ? e.meta?.target : undefined;
          const tgt = Array.isArray(target) ? (target as string[]) : [];
          const legacyCuratedLinePair =
            tgt.length === 2 &&
            (tgt.includes('curatedShareId') || tgt.includes('curated_share_id')) &&
            (tgt.includes('productId') || tgt.includes('product_id'));
          if (legacyCuratedLinePair) {
            throw new AppError(
              409,
              'Database still enforces only one share row per product per share. Run: npx prisma migrate deploy (packages/backend), restart the API, then try selecting multiple photos again.',
            );
          }
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

    return recipients.map((r) => {
      const lines = r.curatedShare.products.map((csp) => ({
        productImageId: csp.productImageId,
        traderOfferUnitPrice: csp.traderOfferUnitPrice,
        product: {
          ...csp.product,
          traderOfferUnitPrice: csp.traderOfferUnitPrice,
        },
      }));
      const seen = new Map<string, typeof lines[0]['product']>();
      for (const l of lines) {
        if (!seen.has(l.product.id)) seen.set(l.product.id, l.product);
      }
      return {
        id: r.curatedShareId,
        isRead: r.isRead,
        trader: r.curatedShare.trader,
        note: r.curatedShare.note,
        orderMode: r.curatedShare.orderMode,
        createdAt: r.curatedShare.createdAt,
        lines,
        products: [...seen.values()],
      };
    });
  }

  /** Photos a buyer received via curated shares for one product — for picker UI. */
  static async sharedPhotosForProduct(customerId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        moq: true,
        price: true,
        priceMax: true,
        images: true,
        vendor: { select: { id: true, name: true, businessName: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundError('Product');

    const rows = await prisma.curatedShareProduct.findMany({
      where: {
        productId,
        curatedShare: { recipients: { some: { customerId } } },
      },
      include: {
        productImage: { select: { id: true, url: true, createdAt: true } },
        curatedShare: {
          select: {
            id: true,
            createdAt: true,
            orderMode: true,
            traderId: true,
            trader: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { curatedShare: { createdAt: 'desc' } },
    });

    const byImage = new Map<string, (typeof rows)[0]>();
    for (const row of rows) {
      if (!row.productImageId || !row.productImage) continue;
      const prev = byImage.get(row.productImageId);
      if (!prev || row.curatedShare.createdAt > prev.curatedShare.createdAt) {
        byImage.set(row.productImageId, row);
      }
    }

    const photos = [...byImage.values()].map((r) => ({
      id: r.productImage!.id,
      url: r.productImage!.url,
      createdAt: r.productImage!.createdAt,
      sharedAt: r.curatedShare.createdAt,
      shareId: r.curatedShare.id,
      orderMode: r.curatedShare.orderMode,
      traderId: r.curatedShare.traderId,
      trader: r.curatedShare.trader,
      traderOfferUnitPrice: r.traderOfferUnitPrice,
    }));

    return { product, photos };
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

  static async listCustomerGroups(traderId: string) {
    return prisma.customerGroup.findMany({
      where: { traderId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  static async getCustomerGroup(traderId: string, groupId: string) {
    const group = await prisma.customerGroup.findFirst({
      where: { id: groupId, traderId },
      include: {
        members: {
          include: {
            customer: { select: { id: true, name: true, businessName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundError('Group');
    return group;
  }

  static async createCustomerGroup(traderId: string, name: string) {
    return prisma.customerGroup.create({
      data: { traderId, name },
      include: { _count: { select: { members: true } } },
    });
  }

  static async updateCustomerGroup(traderId: string, groupId: string, name: string) {
    const g = await prisma.customerGroup.findFirst({ where: { id: groupId, traderId } });
    if (!g) throw new NotFoundError('Group');
    return prisma.customerGroup.update({
      where: { id: groupId },
      data: { name },
      include: { _count: { select: { members: true } } },
    });
  }

  static async deleteCustomerGroup(traderId: string, groupId: string) {
    const g = await prisma.customerGroup.findFirst({ where: { id: groupId, traderId } });
    if (!g) throw new NotFoundError('Group');
    await prisma.customerGroup.delete({ where: { id: groupId } });
  }

  static async addMembersToCustomerGroup(traderId: string, groupId: string, customerIds: string[]) {
    await this.getCustomerGroup(traderId, groupId);
    const unique = [...new Set(customerIds)];
    await this.assertCustomersFollowTrader(traderId, unique);
    await prisma.customerGroupMember.createMany({
      data: unique.map((customerId) => ({ groupId, customerId })),
      skipDuplicates: true,
    });
    return this.getCustomerGroup(traderId, groupId);
  }

  static async removeMemberFromCustomerGroup(traderId: string, groupId: string, customerId: string) {
    await this.getCustomerGroup(traderId, groupId);
    await prisma.customerGroupMember.deleteMany({ where: { groupId, customerId } });
  }
}
