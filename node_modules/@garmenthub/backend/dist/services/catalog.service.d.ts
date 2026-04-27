export declare class CatalogService {
    static listCategoriesForVendor(vendorId: string): Promise<{
        defaultAttributes: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            categoryId: string;
            sortOrder: number;
        }[];
        vendorAttributes: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            categoryId: string;
            sortOrder: number;
            vendorId: string;
        }[];
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
    }[]>;
    static createVendorAttribute(vendorId: string, categoryId: string, name: string, sortOrder?: number): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        categoryId: string;
        sortOrder: number;
        vendorId: string;
    }>;
    static updateVendorAttribute(vendorId: string, categoryId: string, attributeId: string, data: {
        name?: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        categoryId: string;
        sortOrder: number;
        vendorId: string;
    }>;
    static deleteVendorAttribute(vendorId: string, categoryId: string, attributeId: string): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=catalog.service.d.ts.map