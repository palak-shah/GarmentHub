import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../dto/product.dto';
import { NotFoundError, ForbiddenError } from '../utils/errors';

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
      include: { vendor: { select: { id: true, name: true, businessName: true } }, brand: true, category: true },
    });
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  static async getByVendor(vendorId: string) {
    return prisma.product.findMany({
      where: { vendorId },
      include: { brand: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(vendorId: string, data: CreateProductDto) {
    return prisma.product.create({
      data: { ...data, vendorId },
      include: { brand: true, category: true },
    });
  }

  static async update(id: string, vendorId: string, data: UpdateProductDto) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    if (product.vendorId !== vendorId) throw new ForbiddenError('Not your product');

    return prisma.product.update({
      where: { id },
      data,
      include: { brand: true, category: true },
    });
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

  static async getCategories() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  static async getFilterOptions() {
    const [patterns, fabrics, colors, categories, brands] = await Promise.all([
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { pattern: true }, distinct: ['pattern'] }),
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { fabric: true }, distinct: ['fabric'] }),
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { color: true }, distinct: ['color'] }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
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
}
