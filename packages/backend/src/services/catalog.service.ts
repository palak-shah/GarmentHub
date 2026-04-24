import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';

const attrOrderBy = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

export class CatalogService {
  static async listCategoriesForVendor(vendorId: string) {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        attributes: { orderBy: attrOrderBy },
        vendorAttributes: {
          where: { vendorId },
          orderBy: attrOrderBy,
        },
      },
    });
    return categories.map(({ vendorAttributes, attributes, ...rest }) => ({
      ...rest,
      defaultAttributes: attributes,
      vendorAttributes,
    }));
  }

  static async createVendorAttribute(
    vendorId: string,
    categoryId: string,
    name: string,
    sortOrder?: number,
  ) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundError('Category');

    return prisma.vendorCategoryAttribute.create({
      data: {
        vendorId,
        categoryId,
        name: name.trim(),
        sortOrder: sortOrder ?? 0,
      },
    });
  }

  static async updateVendorAttribute(
    vendorId: string,
    categoryId: string,
    attributeId: string,
    data: { name?: string; sortOrder?: number },
  ) {
    const row = await prisma.vendorCategoryAttribute.findFirst({
      where: { id: attributeId, vendorId, categoryId },
    });
    if (!row) throw new NotFoundError('Attribute');

    return prisma.vendorCategoryAttribute.update({
      where: { id: attributeId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  }

  static async deleteVendorAttribute(vendorId: string, categoryId: string, attributeId: string) {
    const row = await prisma.vendorCategoryAttribute.findFirst({
      where: { id: attributeId, vendorId, categoryId },
    });
    if (!row) throw new NotFoundError('Attribute');

    await prisma.vendorCategoryAttribute.delete({ where: { id: attributeId } });
    return { deleted: true };
  }
}
