import { Prisma } from '@prisma/client';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../dto/product.dto';
export declare class ProductService {
    static list(query: ProductQueryDto): Promise<{
        products: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
            };
            vendor: {
                id: string;
                name: string;
                businessName: string | null;
            };
            brand: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                vendorId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.ProductStatus;
            updatedAt: Date;
            images: string[];
            brandId: string;
            categoryId: string;
            pattern: string;
            fabric: string;
            color: string;
            attributeValues: Prisma.JsonValue;
            price: number | null;
            moq: number;
            vendorId: string;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    static getById(id: string): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
        vendor: {
            id: string;
            name: string;
            businessName: string | null;
        };
        brand: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            vendorId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        updatedAt: Date;
        images: string[];
        brandId: string;
        categoryId: string;
        pattern: string;
        fabric: string;
        color: string;
        attributeValues: Prisma.JsonValue;
        price: number | null;
        moq: number;
        vendorId: string;
    } & {
        displayAttributes: {
            label: string;
            value: string;
        }[];
    }>;
    static getByVendor(vendorId: string): Promise<({
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
        brand: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            vendorId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        updatedAt: Date;
        images: string[];
        brandId: string;
        categoryId: string;
        pattern: string;
        fabric: string;
        color: string;
        attributeValues: Prisma.JsonValue;
        price: number | null;
        moq: number;
        vendorId: string;
    } & {
        displayAttributes: {
            label: string;
            value: string;
        }[];
    })[]>;
    static create(vendorId: string, data: CreateProductDto): Promise<{
        category: {
            attributes: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                categoryId: string;
                sortOrder: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
        brand: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            vendorId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        updatedAt: Date;
        images: string[];
        brandId: string;
        categoryId: string;
        pattern: string;
        fabric: string;
        color: string;
        attributeValues: Prisma.JsonValue;
        price: number | null;
        moq: number;
        vendorId: string;
    } & {
        displayAttributes: {
            label: string;
            value: string;
        }[];
    }>;
    static update(id: string, vendorId: string, data: UpdateProductDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        updatedAt: Date;
        images: string[];
        brandId: string;
        categoryId: string;
        pattern: string;
        fabric: string;
        color: string;
        attributeValues: Prisma.JsonValue;
        price: number | null;
        moq: number;
        vendorId: string;
    } & {
        displayAttributes: {
            label: string;
            value: string;
        }[];
    }>;
    static delete(id: string, vendorId: string): Promise<{
        deleted: boolean;
    }>;
    static bulkDelete(ids: string[], vendorId: string): Promise<{
        deleted: number;
    }>;
    static getCategories(): Promise<({
        attributes: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            categoryId: string;
            sortOrder: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
    })[]>;
    static getFilterOptions(): Promise<{
        categories: ({
            attributes: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                categoryId: string;
                sortOrder: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        })[];
        brands: {
            id: string;
            name: string;
        }[];
        patterns: string[];
        fabrics: string[];
        colors: string[];
    }>;
}
//# sourceMappingURL=product.service.d.ts.map