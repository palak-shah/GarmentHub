"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
const attribute_helpers_1 = require("./attribute.helpers");
const categoryAttrInclude = {
    attributes: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
};
async function enrichProduct(product) {
    const values = (0, attribute_helpers_1.jsonToStringRecord)(product.attributeValues);
    const cat = await db_1.prisma.category.findUnique({
        where: { id: product.categoryId },
        include: categoryAttrInclude,
    });
    const vendAttrs = await db_1.prisma.vendorCategoryAttribute.findMany({
        where: { vendorId: product.vendorId, categoryId: product.categoryId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const displayAttributes = [];
    if (cat) {
        for (const a of cat.attributes) {
            const v = values[a.id];
            if (v)
                displayAttributes.push({ label: a.name, value: v });
        }
    }
    for (const a of vendAttrs) {
        const v = values[a.id];
        if (v)
            displayAttributes.push({ label: a.name, value: v });
    }
    if (displayAttributes.length === 0) {
        if (product.fabric)
            displayAttributes.push({ label: 'Fabric', value: product.fabric });
        if (product.pattern)
            displayAttributes.push({ label: 'Pattern', value: product.pattern });
        if (product.color)
            displayAttributes.push({ label: 'Color', value: product.color });
    }
    return { ...product, displayAttributes };
}
class ProductService {
    static async list(query) {
        const where = { status: 'ACTIVE' };
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { pattern: { contains: query.search, mode: 'insensitive' } },
                { fabric: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.brandId)
            where.brandId = query.brandId;
        if (query.categoryId)
            where.categoryId = query.categoryId;
        if (query.pattern)
            where.pattern = { contains: query.pattern, mode: 'insensitive' };
        if (query.fabric)
            where.fabric = { contains: query.fabric, mode: 'insensitive' };
        if (query.color)
            where.color = { contains: query.color, mode: 'insensitive' };
        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            where.price = {};
            if (query.minPrice !== undefined)
                where.price.gte = query.minPrice;
            if (query.maxPrice !== undefined)
                where.price.lte = query.maxPrice;
        }
        const skip = (query.page - 1) * query.limit;
        const [products, total] = await Promise.all([
            db_1.prisma.product.findMany({
                where,
                include: { vendor: { select: { id: true, name: true, businessName: true } }, brand: true, category: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: query.limit,
            }),
            db_1.prisma.product.count({ where }),
        ]);
        return {
            products,
            pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
        };
    }
    static async getById(id) {
        const product = await db_1.prisma.product.findUnique({
            where: { id },
            include: { vendor: { select: { id: true, name: true, businessName: true } }, brand: true, category: true },
        });
        if (!product)
            throw new errors_1.NotFoundError('Product');
        return enrichProduct(product);
    }
    static async getByVendor(vendorId) {
        const products = await db_1.prisma.product.findMany({
            where: { vendorId },
            include: { brand: true, category: true },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(products.map((p) => enrichProduct(p)));
    }
    static async create(vendorId, data) {
        const catAttrs = await db_1.prisma.categoryAttribute.findMany({ where: { categoryId: data.categoryId } });
        const avJson = await (0, attribute_helpers_1.parseAndValidateAttributeValues)(vendorId, data.categoryId, data.attributeValues);
        const values = (0, attribute_helpers_1.jsonToStringRecord)(avJson);
        const legacy = (0, attribute_helpers_1.resolveLegacyColumns)(catAttrs, values, {
            fabric: data.fabric,
            pattern: data.pattern,
            color: data.color,
        });
        const { attributeValues: _drop, ...fields } = data;
        const product = await db_1.prisma.product.create({
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
        return enrichProduct(product);
    }
    static async update(id, vendorId, data) {
        const product = await db_1.prisma.product.findUnique({ where: { id } });
        if (!product)
            throw new errors_1.NotFoundError('Product');
        if (product.vendorId !== vendorId)
            throw new errors_1.ForbiddenError('Not your product');
        const categoryId = data.categoryId ?? product.categoryId;
        const catAttrs = await db_1.prisma.categoryAttribute.findMany({ where: { categoryId } });
        let attributeValues = product.attributeValues;
        if (data.attributeValues !== undefined) {
            attributeValues = await (0, attribute_helpers_1.parseAndValidateAttributeValues)(vendorId, categoryId, data.attributeValues);
        }
        const values = (0, attribute_helpers_1.jsonToStringRecord)(attributeValues);
        const fallbackFabric = data.fabric ?? product.fabric;
        const fallbackPattern = data.pattern ?? product.pattern;
        const fallbackColor = data.color ?? product.color;
        const legacy = (0, attribute_helpers_1.resolveLegacyColumns)(catAttrs, values, {
            fabric: fallbackFabric,
            pattern: fallbackPattern,
            color: fallbackColor,
        });
        const { attributeValues: _drop, ...rest } = data;
        const updated = await db_1.prisma.product.update({
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
    static async delete(id, vendorId) {
        const product = await db_1.prisma.product.findUnique({ where: { id } });
        if (!product)
            throw new errors_1.NotFoundError('Product');
        if (product.vendorId !== vendorId)
            throw new errors_1.ForbiddenError('Not your product');
        await db_1.prisma.product.delete({ where: { id } });
        return { deleted: true };
    }
    static async bulkDelete(ids, vendorId) {
        const products = await db_1.prisma.product.findMany({ where: { id: { in: ids } } });
        const notOwned = products.filter((p) => p.vendorId !== vendorId);
        if (notOwned.length > 0)
            throw new errors_1.ForbiddenError('Some products do not belong to you');
        const found = products.map((p) => p.id);
        const missing = ids.filter((id) => !found.includes(id));
        if (missing.length > 0)
            throw new errors_1.NotFoundError('Some products');
        const result = await db_1.prisma.product.deleteMany({ where: { id: { in: ids }, vendorId } });
        return { deleted: result.count };
    }
    static async getCategories() {
        return db_1.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: categoryAttrInclude,
        });
    }
    static async getFilterOptions() {
        const [patterns, fabrics, colors, categories, brands] = await Promise.all([
            db_1.prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { pattern: true }, distinct: ['pattern'] }),
            db_1.prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { fabric: true }, distinct: ['fabric'] }),
            db_1.prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { color: true }, distinct: ['color'] }),
            db_1.prisma.category.findMany({ orderBy: { name: 'asc' }, include: categoryAttrInclude }),
            db_1.prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
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
exports.ProductService = ProductService;
//# sourceMappingURL=product.service.js.map