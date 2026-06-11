"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurationService = void 0;
const db_1 = require("../config/db");
const notification_service_1 = require("./notification.service");
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
class CurationService {
    static async resolveGroupRecipientIds(traderId, groupIds) {
        if (groupIds.length === 0)
            return [];
        const uniqueGroupIds = [...new Set(groupIds)];
        const groups = await db_1.prisma.customerGroup.findMany({
            where: { traderId, id: { in: uniqueGroupIds } },
            include: { members: { select: { customerId: true } } },
        });
        if (groups.length !== uniqueGroupIds.length) {
            throw new errors_1.AppError(400, 'One or more customer groups are invalid');
        }
        return [...new Set(groups.flatMap((g) => g.members.map((m) => m.customerId)))];
    }
    /**
     * Curated shares / groups may only go to users linked to the trader:
     * - they follow the trader, or
     * - the trader follows them (customers & traders — not vendors).
     */
    static async assertCustomersFollowTrader(traderId, customerIds) {
        if (customerIds.length === 0)
            return;
        const unique = [...new Set(customerIds)];
        const links = await db_1.prisma.connection.findMany({
            where: {
                OR: [
                    { followingId: traderId, followerId: { in: unique } },
                    {
                        followerId: traderId,
                        followingId: { in: unique },
                        following: { role: { in: ['CUSTOMER', 'TRADER'] } },
                    },
                ],
            },
            select: { followerId: true, followingId: true },
        });
        const allowed = new Set();
        for (const row of links) {
            if (row.followingId === traderId)
                allowed.add(row.followerId);
            else if (row.followerId === traderId)
                allowed.add(row.followingId);
        }
        if (allowed.size !== unique.length) {
            throw new errors_1.AppError(400, 'You can only share with people connected to you (they follow you, or you follow them as a customer). Refresh the list and try again.');
        }
    }
    static async createShare(traderId, lines, customerIds, customerGroupIds = [], note, orderMode = 'DIRECT') {
        if (lines.length === 0)
            throw new errors_1.AppError(400, 'Select at least one product');
        const fromGroups = await this.resolveGroupRecipientIds(traderId, customerGroupIds);
        const uniqueCustomerIds = [...new Set([...customerIds, ...fromGroups])];
        if (uniqueCustomerIds.length === 0) {
            throw new errors_1.AppError(400, 'Select at least one customer or a non-empty customer group');
        }
        const deduped = new Map();
        for (const line of lines) {
            const key = `${line.productId}:${line.productImageId ?? ''}`;
            deduped.set(key, line);
        }
        const uniqueLines = [...deduped.values()];
        const productIds = [...new Set(uniqueLines.map((l) => l.productId))];
        for (const line of uniqueLines) {
            if (line.productImageId) {
                const img = await db_1.prisma.productImage.findFirst({
                    where: { id: line.productImageId, productId: line.productId },
                });
                if (!img)
                    throw new errors_1.AppError(400, 'One or more selected photos are invalid for this product');
            }
        }
        const activeCount = await db_1.prisma.product.count({
            where: { id: { in: productIds }, status: 'ACTIVE' },
        });
        if (activeCount !== productIds.length) {
            throw new errors_1.AppError(400, 'One or more products are missing or not active');
        }
        const recipientCount = await db_1.prisma.user.count({
            where: { id: { in: uniqueCustomerIds }, isActive: true },
        });
        if (recipientCount !== uniqueCustomerIds.length) {
            throw new errors_1.AppError(400, 'One or more recipients are invalid or inactive');
        }
        await this.assertCustomersFollowTrader(traderId, uniqueCustomerIds);
        let share;
        try {
            share = await db_1.prisma.curatedShare.create({
                data: {
                    traderId,
                    note,
                    orderMode: orderMode,
                    products: {
                        create: uniqueLines.map(({ productId, traderOfferUnitPrice, productImageId }) => ({
                            productId,
                            productImageId: productImageId ?? null,
                            traderOfferUnitPrice: traderOfferUnitPrice != null && Number.isFinite(traderOfferUnitPrice)
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
        }
        catch (e) {
            const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError || code) {
                if (code === 'P2003') {
                    throw new errors_1.AppError(400, 'Invalid product or customer reference');
                }
                if (code === 'P2002') {
                    const target = e instanceof client_1.Prisma.PrismaClientKnownRequestError ? e.meta?.target : undefined;
                    const tgt = Array.isArray(target) ? target : [];
                    const legacyCuratedLinePair = tgt.length === 2 &&
                        (tgt.includes('curatedShareId') || tgt.includes('curated_share_id')) &&
                        (tgt.includes('productId') || tgt.includes('product_id'));
                    if (legacyCuratedLinePair) {
                        throw new errors_1.AppError(409, 'Database still enforces only one share row per product per share. Run: npx prisma migrate deploy (packages/backend), restart the API, then try selecting multiple photos again.');
                    }
                    throw new errors_1.AppError(409, 'This share could not be created due to a duplicate entry. Try again.');
                }
                if (code === 'P2021' || code === 'P2022') {
                    throw new errors_1.AppError(500, 'Database is missing tables or columns. Run: npx prisma migrate deploy && npx prisma generate (from packages/backend), then restart the API.');
                }
            }
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[CurationService] curatedShare.create failed:', e);
            if (msg.includes('traderOfferUnitPrice') ||
                msg.includes('does not exist') ||
                /column .* does not exist/i.test(msg)) {
                throw new errors_1.AppError(500, 'Database is missing curated share price column. Run: npx prisma migrate deploy && npx prisma generate (from packages/backend), then restart the API.');
            }
            throw e;
        }
        const { WorkflowService } = await Promise.resolve().then(() => __importStar(require('./workflow.service')));
        try {
            await WorkflowService.markBulkState(traderId, productIds, client_1.WorkflowState.SHARED);
        }
        catch (e) {
            console.error('[CurationService] markBulkState after share:', e);
        }
        const trader = await db_1.prisma.user.findUnique({
            where: { id: traderId },
            select: { name: true, businessName: true },
        });
        const traderName = trader?.businessName || trader?.name || 'A trader';
        try {
            await Promise.all(uniqueCustomerIds.map((cId) => notification_service_1.NotificationService.create(cId, 'CURATED_SHARE', 'New products shared', `${traderName} shared ${productIds.length} product${productIds.length > 1 ? 's' : ''} with you`, share.id)));
        }
        catch (e) {
            console.error('[CurationService] notifications after share:', e);
        }
        return share;
    }
    static async listSentByTrader(traderId) {
        return db_1.prisma.curatedShare.findMany({
            where: { traderId },
            include: {
                products: {
                    include: {
                        product: { select: { id: true, name: true, images: true, price: true } },
                        productImage: { select: { id: true, url: true, createdAt: true } },
                    },
                },
                recipients: { include: { customer: { select: { id: true, name: true, businessName: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    static async listReceivedByCustomer(customerId) {
        const recipients = await db_1.prisma.curatedShareRecipient.findMany({
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
            const seen = new Map();
            for (const l of lines) {
                if (!seen.has(l.product.id))
                    seen.set(l.product.id, l.product);
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
    static async sharedPhotosForProduct(customerId, productId) {
        const product = await db_1.prisma.product.findFirst({
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
        if (!product)
            throw new errors_1.NotFoundError('Product');
        const rows = await db_1.prisma.curatedShareProduct.findMany({
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
        const byImage = new Map();
        for (const row of rows) {
            if (!row.productImageId || !row.productImage)
                continue;
            const prev = byImage.get(row.productImageId);
            if (!prev || row.curatedShare.createdAt > prev.curatedShare.createdAt) {
                byImage.set(row.productImageId, row);
            }
        }
        const photos = [...byImage.values()].map((r) => ({
            id: r.productImage.id,
            url: r.productImage.url,
            createdAt: r.productImage.createdAt,
            sharedAt: r.curatedShare.createdAt,
            shareId: r.curatedShare.id,
            orderMode: r.curatedShare.orderMode,
            traderId: r.curatedShare.traderId,
            trader: r.curatedShare.trader,
            traderOfferUnitPrice: r.traderOfferUnitPrice,
        }));
        return { product, photos };
    }
    static async markShareRead(curatedShareId, customerId) {
        await db_1.prisma.curatedShareRecipient.updateMany({
            where: { curatedShareId, customerId },
            data: { isRead: true },
        });
    }
    /** Buyers linked to this trader: inbound followers OR outbound follows to customers/traders (deduped). */
    static async getTraderCustomers(traderId) {
        const [inbound, outbound] = await Promise.all([
            db_1.prisma.connection.findMany({
                where: { followingId: traderId },
                include: {
                    follower: {
                        select: { id: true, name: true, businessName: true, role: true, isActive: true },
                    },
                },
            }),
            db_1.prisma.connection.findMany({
                where: {
                    followerId: traderId,
                    following: { role: { in: ['CUSTOMER', 'TRADER'] }, isActive: true },
                },
                include: {
                    following: {
                        select: { id: true, name: true, businessName: true, role: true, isActive: true },
                    },
                },
            }),
        ]);
        const byId = new Map();
        for (const c of inbound) {
            if (!c.follower.isActive)
                continue;
            if (c.follower.role === 'CUSTOMER' || c.follower.role === 'TRADER') {
                const { id, name, businessName, role } = c.follower;
                byId.set(id, { id, name, businessName, role });
            }
        }
        for (const c of outbound) {
            const u = c.following;
            if (!u.isActive)
                continue;
            if (u.role === 'CUSTOMER' || u.role === 'TRADER') {
                const { id, name, businessName, role } = u;
                byId.set(id, { id, name, businessName, role });
            }
        }
        return [...byId.values()].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    }
    static async listCustomerGroups(traderId) {
        return db_1.prisma.customerGroup.findMany({
            where: { traderId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { members: true } },
            },
        });
    }
    static async getCustomerGroup(traderId, groupId) {
        const group = await db_1.prisma.customerGroup.findFirst({
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
        if (!group)
            throw new errors_1.NotFoundError('Group');
        return group;
    }
    static async createCustomerGroup(traderId, name) {
        return db_1.prisma.customerGroup.create({
            data: { traderId, name },
            include: { _count: { select: { members: true } } },
        });
    }
    static async updateCustomerGroup(traderId, groupId, name) {
        const g = await db_1.prisma.customerGroup.findFirst({ where: { id: groupId, traderId } });
        if (!g)
            throw new errors_1.NotFoundError('Group');
        return db_1.prisma.customerGroup.update({
            where: { id: groupId },
            data: { name },
            include: { _count: { select: { members: true } } },
        });
    }
    static async deleteCustomerGroup(traderId, groupId) {
        const g = await db_1.prisma.customerGroup.findFirst({ where: { id: groupId, traderId } });
        if (!g)
            throw new errors_1.NotFoundError('Group');
        await db_1.prisma.customerGroup.delete({ where: { id: groupId } });
    }
    static async addMembersToCustomerGroup(traderId, groupId, customerIds) {
        await this.getCustomerGroup(traderId, groupId);
        const unique = [...new Set(customerIds)];
        await this.assertCustomersFollowTrader(traderId, unique);
        await db_1.prisma.customerGroupMember.createMany({
            data: unique.map((customerId) => ({ groupId, customerId })),
            skipDuplicates: true,
        });
        return this.getCustomerGroup(traderId, groupId);
    }
    static async removeMemberFromCustomerGroup(traderId, groupId, customerId) {
        await this.getCustomerGroup(traderId, groupId);
        await db_1.prisma.customerGroupMember.deleteMany({ where: { groupId, customerId } });
    }
}
exports.CurationService = CurationService;
//# sourceMappingURL=curation.service.js.map