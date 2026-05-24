import { OrderStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError, ForbiddenError, NotFoundError } from '../utils/errors';

export class NetworkService {
  static async getStories(userId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const connections = await prisma.connection.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = connections.map((c) => c.followingId);
    if (followedIds.length === 0) return [];

    // Resolve vendor IDs: customers follow traders → resolve their vendors
    let vendorScope: string[];
    if (user?.role === 'CUSTOMER') {
      const followedUsers = await prisma.user.findMany({
        where: { id: { in: followedIds } },
        select: { id: true, role: true },
      });
      const traderIds = followedUsers.filter((u) => u.role === 'TRADER').map((u) => u.id);
      const directVendorIds = followedUsers.filter((u) => u.role === 'VENDOR').map((u) => u.id);

      let indirectVendorIds: string[] = [];
      if (traderIds.length > 0) {
        const traderConns = await prisma.connection.findMany({
          where: { followerId: { in: traderIds } },
          select: { followingId: true },
        });
        const candidateIds = [...new Set(traderConns.map((c) => c.followingId))];
        if (candidateIds.length > 0) {
          const vendors = await prisma.user.findMany({
            where: { id: { in: candidateIds }, role: 'VENDOR' },
            select: { id: true },
          });
          indirectVendorIds = vendors.map((u) => u.id);
        }
      }
      vendorScope = [...new Set([...directVendorIds, ...indirectVendorIds])];
    } else if (user?.role === 'VENDOR') {
      // Vendors do not follow others; "stories" = this vendor's own recent uploads.
      vendorScope = [userId];
    } else {
      vendorScope = followedIds;
    }

    if (vendorScope.length === 0) return [];

    const recentProducts = await prisma.product.groupBy({
      by: ['vendorId'],
      where: {
        createdAt: { gte: since },
        vendorId: { in: vendorScope },
      },
      _count: { id: true },
    });

    if (recentProducts.length === 0) return [];

    const storyVendorIds = recentProducts.map((p) => p.vendorId);
    const vendors = await prisma.user.findMany({
      where: { id: { in: storyVendorIds } },
      select: { id: true, name: true, businessName: true },
    });

    const countMap = new Map(recentProducts.map((p) => [p.vendorId, p._count.id]));

    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      businessName: v.businessName,
      newCount: countMap.get(v.id) ?? 0,
    }));
  }

  static async getConnections(userId: string) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (me?.role === 'VENDOR') {
      // Inbound only: traders who follow this vendor (vendors never follow traders).
      const inbound = await prisma.connection.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: { id: true, name: true, businessName: true, role: true },
          },
        },
      });
      return inbound
        .filter((c) => c.follower.role === 'TRADER')
        .map((c) => c.follower);
    }

    const connections = await prisma.connection.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, name: true, businessName: true, role: true },
        },
      },
    });

    return connections.map((c) => c.following);
  }

  static async getSuggestions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const existing = await prisma.connection.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const excludeIds = [userId, ...existing.map((c) => c.followingId)];

    // Role-appropriate suggestions:
    // Trader sees vendors + customers, Customer sees traders, Vendor sees traders
    const suggestRoles =
      user?.role === 'TRADER' ? ['VENDOR', 'CUSTOMER'] :
      user?.role === 'CUSTOMER' ? ['TRADER'] :
      user?.role === 'VENDOR' ? [] :
      ['VENDOR', 'TRADER', 'CUSTOMER'];

    if (suggestRoles.length === 0) return [];

    return prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        role: { in: suggestRoles },
        isActive: true,
      },
      select: { id: true, name: true, businessName: true, role: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  static async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new AppError(400, 'You cannot follow yourself');
    }

    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { role: true },
    });
    if (follower?.role === 'VENDOR') {
      throw new AppError(400, 'Vendors cannot follow other users; traders follow you.');
    }

    return prisma.connection.create({
      data: { followerId, followingId },
    });
  }

  /**
   * Vendor-only: connect an existing trader on the app (same edge as trader following the vendor).
   * Use invite link for people not yet on GarmentHub.
   */
  static async vendorConnectTrader(vendorId: string, traderId: string) {
    if (vendorId === traderId) {
      throw new AppError(400, 'Invalid trader');
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { role: true },
    });
    if (vendor?.role !== 'VENDOR') {
      throw new ForbiddenError('Only vendors can connect traders');
    }

    const trader = await prisma.user.findUnique({
      where: { id: traderId },
      select: { id: true, role: true, isActive: true },
    });
    if (!trader || !trader.isActive) {
      throw new NotFoundError('User');
    }
    if (trader.role !== 'TRADER') {
      throw new AppError(400, 'You can only connect traders');
    }

    await prisma.connection.upsert({
      where: { followerId_followingId: { followerId: traderId, followingId: vendorId } },
      create: { followerId: traderId, followingId: vendorId },
      update: {},
    });
  }

  /**
   * Non-vendor: delete my outbound follow (I was following `followingId`).
   * Vendor: remove a trader from my list — delete their inbound edge (trader followed me).
   */
  static async unfollow(viewerId: string, targetUserId: string) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true },
    });
    if (viewer?.role === 'VENDOR') {
      return prisma.connection.delete({
        where: {
          followerId_followingId: { followerId: targetUserId, followingId: viewerId },
        },
      });
    }
    return prisma.connection.delete({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
    });
  }

  static async searchUsers(query: string, currentUserId: string) {
    const me = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    const roleFilter =
      me?.role === 'VENDOR'
        ? { role: 'TRADER' as const }
        : { role: { not: 'ADMIN' as const } };

    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        ...roleFilter,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { businessName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      select: { id: true, name: true, businessName: true, role: true, phone: true },
      take: 20,
    });
  }

  static async getOrCreateInviteCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    });
    if (user?.inviteCode) return user.inviteCode;

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await prisma.user.update({
      where: { id: userId },
      data: { inviteCode: code },
    });
    return code;
  }

  /**
   * Vendor-only: stats for a connected trader (they follow the vendor).
   */
  static async getTraderInsightsForVendor(vendorId: string, traderId: string) {
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { role: true },
    });
    if (vendor?.role !== 'VENDOR') {
      throw new ForbiddenError('Only vendors can view trader insights');
    }

    const trader = await prisma.user.findUnique({
      where: { id: traderId },
      select: { id: true, name: true, businessName: true, role: true, phone: true },
    });
    if (!trader || trader.role !== 'TRADER') {
      throw new NotFoundError('Trader');
    }

    const linked = await prisma.connection.findUnique({
      where: { followerId_followingId: { followerId: traderId, followingId: vendorId } },
    });
    if (!linked) {
      throw new AppError(403, 'This trader is not connected to you');
    }

    const [orderItems, buyersFollowingTrader, curatedRecipientRows, activeProductsWithTrader] =
      await Promise.all([
        prisma.orderItem.findMany({
          where: {
            vendorId,
            order: {
              traderId,
              releasedToVendorsAt: { not: null },
              status: { not: OrderStatus.CANCELLED },
            },
          },
          select: { orderId: true, order: { select: { customerId: true } } },
        }),
        prisma.connection.count({
          where: {
            followingId: traderId,
            follower: { role: 'CUSTOMER', isActive: true },
          },
        }),
        prisma.curatedShareRecipient.findMany({
          where: { curatedShare: { traderId } },
          select: { customerId: true },
        }),
        prisma.product.count({
          where: { vendorId, traderId, status: 'ACTIVE' },
        }),
      ]);

    const orderIds = new Set(orderItems.map((i) => i.orderId));
    const buyerIdsFromOrders = new Set(orderItems.map((i) => i.order.customerId));
    const curatedReach = new Set(curatedRecipientRows.map((r) => r.customerId)).size;

    return {
      trader,
      stats: {
        ordersCount: orderIds.size,
        uniqueBuyersFromOrders: buyerIdsFromOrders.size,
        buyersFollowingTrader: buyersFollowingTrader,
        curatedShareRecipients: curatedReach,
        activeProductsWithTrader: activeProductsWithTrader,
      },
    };
  }

  static async connectViaInvite(inviteCode: string, followerId: string) {
    const inviter = await prisma.user.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, businessName: true },
    });
    if (!inviter) throw new AppError(404, 'Invalid invite code');
    if (inviter.id === followerId) throw new AppError(400, 'Cannot connect to yourself');

    await prisma.connection.upsert({
      where: { followerId_followingId: { followerId, followingId: inviter.id } },
      create: { followerId, followingId: inviter.id },
      update: {},
    });

    return inviter;
  }
}
