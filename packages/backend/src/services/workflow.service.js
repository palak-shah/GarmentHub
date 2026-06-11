"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const db_1 = require("../config/db");
const STATE_PRIORITY = {
    UNSEEN: 0,
    SEEN: 1,
    SKIPPED: 2,
    SHARED: 3,
    ORDERED: 4,
};
function canTransition(current, next) {
    if (!current)
        return true;
    return STATE_PRIORITY[next] >= STATE_PRIORITY[current];
}
class WorkflowService {
    static async markState(userId, productId, state) {
        const existing = await db_1.prisma.userProductState.findUnique({
            where: { userId_productId: { userId, productId } },
            select: { state: true },
        });
        if (!canTransition(existing?.state ?? null, state))
            return existing;
        return db_1.prisma.userProductState.upsert({
            where: { userId_productId: { userId, productId } },
            create: { userId, productId, state },
            update: { state },
        });
    }
    static async markBulkState(userId, productIds, state) {
        if (productIds.length === 0)
            return;
        const existing = await db_1.prisma.userProductState.findMany({
            where: { userId, productId: { in: productIds } },
            select: { productId: true, state: true },
        });
        const currentState = new Map(existing.map((e) => [e.productId, e.state]));
        const eligible = productIds.filter((id) => canTransition(currentState.get(id) ?? null, state));
        if (eligible.length === 0)
            return;
        const existingIds = new Set(existing.map((e) => e.productId));
        const toCreate = eligible.filter((id) => !existingIds.has(id));
        const toUpdate = eligible.filter((id) => existingIds.has(id));
        const ops = [];
        if (toCreate.length > 0) {
            ops.push(db_1.prisma.userProductState.createMany({
                data: toCreate.map((productId) => ({ userId, productId, state })),
                skipDuplicates: true,
            }));
        }
        if (toUpdate.length > 0) {
            ops.push(db_1.prisma.userProductState.updateMany({
                where: { userId, productId: { in: toUpdate } },
                data: { state },
            }));
        }
        if (ops.length > 0)
            await db_1.prisma.$transaction(ops);
    }
    static async getFeedByState(userId, state, cursor, limit = 20) {
        const states = await db_1.prisma.userProductState.findMany({
            where: { userId, state },
            include: {
                product: {
                    include: {
                        category: { select: { id: true, name: true } },
                        vendor: { select: { id: true, name: true, businessName: true } },
                        trader: { select: { id: true, name: true, businessName: true } },
                        imageAssets: { select: { id: true, url: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
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
    static async getUnseenGrouped(userId, limit = 40) {
        const products = await this.getUnseenProducts(userId, limit);
        const groups = {};
        for (const p of products) {
            const dateKey = new Date(p.updatedAt).toISOString().slice(0, 10);
            const key = `${p.vendorId}_${dateKey}`;
            if (!groups[key]) {
                groups[key] = { vendor: p.vendor, date: dateKey, products: [] };
            }
            groups[key].products.push(p);
        }
        for (const g of Object.values(groups)) {
            g.products.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }
    static async getUnseenProducts(userId, limit = 40) {
        const connections = await db_1.prisma.connection.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followedIds = connections.map((c) => c.followingId);
        const include = {
            category: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true, businessName: true } },
            trader: { select: { id: true, name: true, businessName: true } },
            imageAssets: { select: { id: true, url: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        };
        // Followed vendors and the rest of the network, then merge by last activity (updatedAt).
        const followedProducts = followedIds.length > 0
            ? await db_1.prisma.product.findMany({
                where: { status: 'ACTIVE', vendorId: { in: followedIds } },
                include,
                orderBy: { updatedAt: 'desc' },
                take: limit,
            })
            : [];
        const otherProducts = await db_1.prisma.product.findMany({
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
    static async getStateCounts(userId) {
        const counts = await db_1.prisma.userProductState.groupBy({
            by: ['state'],
            where: { userId },
            _count: true,
        });
        const result = {
            UNSEEN: 0, SEEN: 0, SHARED: 0, ORDERED: 0, SKIPPED: 0,
        };
        for (const c of counts) {
            result[c.state] = c._count;
        }
        const totalProducts = await db_1.prisma.product.count({
            where: { status: 'ACTIVE' },
        });
        const trackedCount = Object.values(result).reduce((a, b) => a + b, 0);
        result.UNSEEN = Math.max(0, totalProducts - trackedCount);
        result.TOTAL = totalProducts;
        return result;
    }
}
exports.WorkflowService = WorkflowService;
//# sourceMappingURL=workflow.service.js.map