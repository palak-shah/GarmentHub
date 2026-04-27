import { prisma } from '../config/db';
import { AppError } from '../utils/errors';

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
      user?.role === 'VENDOR' ? ['TRADER'] :
      ['VENDOR', 'TRADER', 'CUSTOMER'];

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

    return prisma.connection.create({
      data: { followerId, followingId },
    });
  }

  static async unfollow(followerId: string, followingId: string) {
    return prisma.connection.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  static async searchUsers(query: string, currentUserId: string) {
    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        role: { not: 'ADMIN' },
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
