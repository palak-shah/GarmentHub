import { prisma } from '../config/db';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';

export class BrandService {
  static async listByVendor(vendorId: string) {
    return prisma.brand.findMany({
      where: { vendorId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  static async listAll() {
    return prisma.brand.findMany({
      include: { vendor: { select: { id: true, name: true, businessName: true } } },
      orderBy: { name: 'asc' },
    });
  }

  static async create(vendorId: string, data: CreateBrandDto) {
    const existing = await prisma.brand.findUnique({
      where: { vendorId_name: { vendorId, name: data.name } },
    });
    if (existing) throw new AppError(409, 'Brand with this name already exists');

    return prisma.brand.create({
      data: { ...data, vendorId },
      include: { _count: { select: { products: true } } },
    });
  }

  static async update(id: string, vendorId: string, data: UpdateBrandDto) {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundError('Brand');
    if (brand.vendorId !== vendorId) throw new ForbiddenError('Not your brand');

    return prisma.brand.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
  }

  static async delete(id: string, vendorId: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundError('Brand');
    if (brand.vendorId !== vendorId) throw new ForbiddenError('Not your brand');
    if (brand._count.products > 0) {
      throw new AppError(400, `Cannot delete brand with ${brand._count.products} product(s). Remove or reassign products first.`);
    }

    await prisma.brand.delete({ where: { id } });
    return { deleted: true };
  }
}
