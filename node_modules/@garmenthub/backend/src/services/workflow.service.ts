import { prisma } from '../config/db';
import { WorkflowState } from '@prisma/client';

const STATE_PRIORITY: Record<string, number> = {
  UNSEEN: 0,
  SEEN: 1,
  SKIPPED: 2,
  SHARED: 3,
  ORDERED: 4,
};

function canTransition(current: WorkflowState | null, next: WorkflowState): boolean {
  if (!current) return true;
  return STATE_PRIORITY[next] >= STATE_PRIORITY[current];
}

export class WorkflowService {
  static async markState(userId: string, productId: string, state: WorkflowState) {
    const existing = await prisma.userProductState.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { state: true },
    });

    if (!canTransition(existing?.state ?? null, state)) return existing;

    return prisma.userProductState.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, state },
      update: { state },
    });
  }

  static async markBulkState(userId: string, productIds: string[], state: WorkflowState) {
    if (productIds.length === 0) return;

    const existing = await prisma.userProductState.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true, state: true },
    });
    const currentState = new Map(existing.map((e) => [e.productId, e.state]));

    const eligible = productIds.filter((id) =>
      canTransition(currentState.get(id) ?? null, state),
    );
    if (eligible.length === 0) return;

    const existingIds = new Set(existing.map((e) => e.productId));
    const toCreate = eligible.filter((id) => !existingIds.has(id));
    const toUpdate = eligible.filter((id) => existingIds.has(id));

    const ops = [];
    if (toCreate.length > 0) {
      ops.push(
        prisma.userProductState.createMany({
          data: toCreate.map((productId) => ({ userId, productId, state })),
          skipDuplicates: true,
        }),
      );
    }
    if (toUpdate.length > 0) {
      ops.push(
        prisma.userProductState.updateMany({
          where: { userId, productId: { in: toUpdate } },
          data: { state },
        }),
      );
    }
    if (ops.length > 0) await prisma.$transaction(ops);
  }

  static async getFeedByState(userId: string, state: WorkflowState, cursor?: string, limit = 20) {
    const states = await prisma.userProductState.findMany({
      where: { userId, state },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
            trader: { select: { id: true, name: true, businessName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = states.length > limit;
    const items = hasMore ? states.slice(0, limit) : states;

    return {
      products: items.map((s) => s.product),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  static async getUnseenGrouped(userId: string, limit = 40) {
    const products = await this.getUnseenProducts(userId, limit);

    const groups: Record<string, { vendor: { id: string; name: string; businessName: string | null }; date: string; products: typeof products }> = {};
    for (const p of products) {
      const dateKey = new Date(p.updatedAt).toISOString().slice(0, 10);
      const key = `${p.vendorId}_${dateKey}`;
      if (!groups[key]) {
        groups[key] = { vendor: p.vendor, date: dateKey, products: [] };
      }
      groups[key].products.push(p);
    }

    for (const g of Object.values(groups)) {
      g.products.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }

  static async getUnseenProducts(userId: string, limit = 40) {
    const connections = await prisma.connection.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = connections.map((c) => c.followingId);

    const include = {
      category: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true, businessName: true } },
      trader: { select: { id: true, name: true, businessName: true } },
    } as const;

    // Followed vendors and the rest of the network, then merge by last activity (updatedAt).
    const followedProducts = followedIds.length > 0
      ? await prisma.product.findMany({
          where: { status: 'ACTIVE', vendorId: { in: followedIds } },
          include,
          orderBy: { updatedAt: 'desc' },
          take: limit,
        })
      : [];

    const otherProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        ...(followedIds.length > 0 ? { vendorId: { notIn: followedIds } } : {}),
      },
      include,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return [...followedProducts, ...otherProducts]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  static async getStateCounts(userId: string) {
    const counts = await prisma.userProductState.groupBy({
      by: ['state'],
      where: { userId },
      _count: true,
    });

    const result: Record<string, number> = {
      UNSEEN: 0, SEEN: 0, SHARED: 0, ORDERED: 0, SKIPPED: 0,
    };
    for (const c of counts) {
      result[c.state] = c._count;
    }

    const totalProducts = await prisma.product.count({
      where: { status: 'ACTIVE' },
    });
    const trackedCount = Object.values(result).reduce((a, b) => a + b, 0);
    result.UNSEEN = Math.max(0, totalProducts - trackedCount);
    result.TOTAL = totalProducts;

    return result;
  }
}
