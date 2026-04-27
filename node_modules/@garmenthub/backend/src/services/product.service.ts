import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../dto/product.dto';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { NotificationService } from './notification.service';
import {
  jsonToStringRecord,
  parseAndValidateAttributeValues,
  resolveLegacyColumns,
} from './attribute.helpers';

const categoryAttrInclude = {
  attributes: { orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] },
};

async function enrichProduct<T extends { attributeValues: unknown; categoryId: string; vendorId: string; fabric: string; pattern: string; color: string }>(
  product: T,
) {
  const values = jsonToStringRecord(product.attributeValues);
  const cat = await prisma.category.findUnique({
    where: { id: product.categoryId },
    include: categoryAttrInclude,
  });
  const vendAttrs = await prisma.vendorCategoryAttribute.findMany({
    where: { vendorId: product.vendorId, categoryId: product.categoryId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const displayAttributes: { label: string; value: string }[] = [];
  if (cat) {
    for (const a of cat.attributes) {
      const v = values[a.id];
      if (v) displayAttributes.push({ label: a.name, value: v });
    }
  }
  for (const a of vendAttrs) {
    const v = values[a.id];
    if (v) displayAttributes.push({ label: a.name, value: v });
  }

  if (displayAttributes.length === 0) {
    if (product.fabric) displayAttributes.push({ label: 'Fabric', value: product.fabric });
    if (product.pattern) displayAttributes.push({ label: 'Pattern', value: product.pattern });
    if (product.color) displayAttributes.push({ label: 'Color', value: product.color });
  }

  return { ...product, displayAttributes };
}

export class ProductService {
  static async list(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { pattern: { contains: query.search, mode: 'insensitive' } },
        { fabric: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.pattern) where.pattern = { contains: query.pattern, mode: 'insensitive' };
    if (query.fabric) where.fabric = { contains: query.fabric, mode: 'insensitive' };
    if (query.color) where.color = { contains: query.color, mode: 'insensitive' };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    const skip = (query.page - 1) * query.limit;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { vendor: { select: { id: true, name: true, businessName: true } }, brand: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, businessName: true, phone: true } },
        trader: { select: { id: true, name: true, businessName: true } },
        brand: true,
        category: true,
      },
    });
    if (!product) throw new NotFoundError('Product');
    return enrichProduct(product);
  }

  static async getByVendor(vendorId: string) {
    const products = await prisma.product.findMany({
      where: { vendorId },
      include: { brand: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(products.map((p) => enrichProduct(p)));
  }

  static async create(vendorId: string, data: CreateProductDto) {
    const catAttrs = await prisma.categoryAttribute.findMany({ where: { categoryId: data.categoryId } });
    const avJson = await parseAndValidateAttributeValues(vendorId, data.categoryId, data.attributeValues);
    const values = jsonToStringRecord(avJson);
    const legacy = resolveLegacyColumns(catAttrs, values, {
      fabric: data.fabric,
      pattern: data.pattern,
      color: data.color,
    });

    const { attributeValues: _drop, ...fields } = data;
    const product = await prisma.product.create({
      data: {
        ...fields,
        vendorId,
        attributeValues: avJson,
        fabric: legacy.fabric,
        pattern: legacy.pattern,
        color: legacy.color,
      },
      include: { brand: true, category: { include: categoryAttrInclude } },
    });

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { businessName: true, name: true },
    });
    NotificationService.queueProductUploadNotification(
      vendorId,
      vendor?.businessName || vendor?.name || 'A vendor',
    );

    return enrichProduct(product);
  }

  static async update(id: string, vendorId: string, data: UpdateProductDto) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    if (product.vendorId !== vendorId) throw new ForbiddenError('Not your product');

    const categoryId = data.categoryId ?? product.categoryId;
    const catAttrs = await prisma.categoryAttribute.findMany({ where: { categoryId } });

    let attributeValues = product.attributeValues;
    if (data.attributeValues !== undefined) {
      attributeValues = await parseAndValidateAttributeValues(vendorId, categoryId, data.attributeValues);
    }

    const values = jsonToStringRecord(attributeValues);
    const fallbackFabric = data.fabric ?? product.fabric;
    const fallbackPattern = data.pattern ?? product.pattern;
    const fallbackColor = data.color ?? product.color;
    const legacy = resolveLegacyColumns(catAttrs, values, {
      fabric: fallbackFabric,
      pattern: fallbackPattern,
      color: fallbackColor,
    });

    const { attributeValues: _drop, ...rest } = data;
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(data.attributeValues !== undefined ? { attributeValues } : {}),
        fabric: legacy.fabric,
        pattern: legacy.pattern,
        color: legacy.color,
      },
      include: { brand: true, category: { include: categoryAttrInclude } },
    });
    return enrichProduct(updated);
  }

  static async delete(id: string, vendorId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    if (product.vendorId !== vendorId) throw new ForbiddenError('Not your product');

    await prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  static async bulkDelete(ids: string[], vendorId: string) {
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const notOwned = products.filter((p) => p.vendorId !== vendorId);
    if (notOwned.length > 0) throw new ForbiddenError('Some products do not belong to you');

    const found = products.map((p) => p.id);
    const missing = ids.filter((id) => !found.includes(id));
    if (missing.length > 0) throw new NotFoundError('Some products');

    const result = await prisma.product.deleteMany({ where: { id: { in: ids }, vendorId } });
    return { deleted: result.count };
  }

  static async bulkUpdate(
    ids: string[],
    vendorId: string,
    updates: { categoryId?: string; moq?: number; status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' },
  ) {
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const notOwned = products.filter((p) => p.vendorId !== vendorId);
    if (notOwned.length > 0) throw new ForbiddenError('Some products do not belong to you');

    const found = products.map((p) => p.id);
    const missing = ids.filter((id) => !found.includes(id));
    if (missing.length > 0) throw new NotFoundError('Some products');

    const data: Record<string, unknown> = {};
    if (updates.categoryId) data.categoryId = updates.categoryId;
    if (updates.moq !== undefined) data.moq = updates.moq;
    if (updates.status) data.status = updates.status;

    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, vendorId },
      data,
    });

    return { updated: result.count };
  }

  static async getCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: categoryAttrInclude,
    });
  }

  static async getFilterOptions() {
    const [patterns, fabrics, colors, categories, brands] = await Promise.all([
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { pattern: true }, distinct: ['pattern'] }),
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { fabric: true }, distinct: ['fabric'] }),
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { color: true }, distinct: ['color'] }),
      prisma.category.findMany({ orderBy: { name: 'asc' }, include: categoryAttrInclude }),
      prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);

    return {
      categories,
      brands,
      patterns: patterns.map((p) => p.pattern).filter(Boolean),
      fabrics: fabrics.map((f) => f.fabric).filter(Boolean),
      colors: colors.map((c) => c.color).filter(Boolean),
    };
  }

  /**
   * Customer feed scoping:
   *   Customer follows Traders → we resolve those traders' followed Vendors
   *   → show products from those vendors + curated share products.
   * Trader feed uses the Workflow endpoints instead.
   */
  static async feed(userId: string, cursor?: string, limit = 20, categoryId?: string | null) {
    const feedInclude = {
      vendor: { select: { id: true, name: true, businessName: true } },
      brand: true,
      category: true,
      trader: { select: { id: true, name: true, businessName: true } },
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const connections = await prisma.connection.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = connections.map((c) => c.followingId);

    let vendorIds: string[] = [];

    if (user?.role === 'CUSTOMER' && followedIds.length > 0) {
      // Customer follows traders (and possibly vendors directly).
      // Resolve followed users' roles so we can look through traders.
      const followedUsers = await prisma.user.findMany({
        where: { id: { in: followedIds } },
        select: { id: true, role: true },
      });

      const directVendorIds = followedUsers
        .filter((u) => u.role === 'VENDOR')
        .map((u) => u.id);
      const traderIds = followedUsers
        .filter((u) => u.role === 'TRADER')
        .map((u) => u.id);

      // Indirect: vendors that followed traders follow
      let indirectVendorIds: string[] = [];
      if (traderIds.length > 0) {
        const traderConns = await prisma.connection.findMany({
          where: { followerId: { in: traderIds } },
          select: { followingId: true },
        });
        const candidateIds = [...new Set(traderConns.map((c) => c.followingId))];
        if (candidateIds.length > 0) {
          const vendorUsers = await prisma.user.findMany({
            where: { id: { in: candidateIds }, role: 'VENDOR' },
            select: { id: true },
          });
          indirectVendorIds = vendorUsers.map((u) => u.id);
        }
      }

      vendorIds = [...new Set([...directVendorIds, ...indirectVendorIds])];
    } else {
      // Trader or other role: followedIds are already vendor IDs
      vendorIds = followedIds;
    }

    // Curated share products — include ALL (read + unread) for customers
    const sharedProductIds = await prisma.curatedShareRecipient.findMany({
      where: { customerId: userId },
      select: { curatedShare: { select: { products: { select: { productId: true } } } } },
    }).then((rows) =>
      [...new Set(rows.flatMap((r) => r.curatedShare.products.map((p) => p.productId)))],
    );

    const networkFilter: Prisma.ProductWhereInput =
      vendorIds.length > 0 || sharedProductIds.length > 0
        ? {
            OR: [
              ...(vendorIds.length > 0 ? [{ vendorId: { in: vendorIds } }] : []),
              ...(sharedProductIds.length > 0 ? [{ id: { in: sharedProductIds } }] : []),
            ],
          }
        : {};

    const userStates = await prisma.userProductState.findMany({
      where: { userId },
      select: { productId: true, state: true },
    });

    const seenIds = userStates.filter((s) => s.state === 'SEEN').map((s) => s.productId);
    const doneIds = userStates
      .filter((s) => s.state === 'SHARED' || s.state === 'ORDERED')
      .map((s) => s.productId);
    const allTrackedIds = userStates.map((s) => s.productId);

    const unseenWhere: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...networkFilter,
      ...(allTrackedIds.length > 0 ? { id: { notIn: allTrackedIds } } : {}),
    };

    if (cursor) {
      const cursorProduct = await prisma.product.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorProduct) {
        unseenWhere.createdAt = { lt: cursorProduct.createdAt };
      }
    }

    const unseenProducts = await prisma.product.findMany({
      where: unseenWhere,
      include: feedInclude,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (unseenProducts.length > limit) {
      const last = unseenProducts.pop()!;
      nextCursor = last.id;
    }

    const pendingProducts = seenIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: { in: seenIds },
            status: 'ACTIVE',
            ...(categoryId ? { categoryId } : {}),
          },
          include: feedInclude,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const doneProducts = doneIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: { in: doneIds },
            status: 'ACTIVE',
            ...(categoryId ? { categoryId } : {}),
          },
          include: feedInclude,
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [];

    return { newProducts: unseenProducts, pendingProducts, doneProducts, nextCursor };
  }

  static async saveProduct(userId: string, productId: string) {
    return prisma.savedProduct.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  static async unsaveProduct(userId: string, productId: string) {
    return prisma.savedProduct.delete({
      where: { userId_productId: { userId, productId } },
    });
  }

  static async getSavedProducts(userId: string) {
    const saved = await prisma.savedProduct.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            vendor: { select: { id: true, name: true, businessName: true } },
            brand: true,
            category: true,
          },
        },
      },
    });
    return saved.map((s) => s.product);
  }
}
