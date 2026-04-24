export declare class AdminService {
    static getUsers(role?: string): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        businessName: string | null;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        _count: {
            products: number;
            orders: number;
        };
    }[]>;
    static toggleUserStatus(userId: string, isActive: boolean): Promise<{
        phone: string;
        id: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    static getAllOrders(): Promise<({
        items: ({
            vendor: {
                id: string;
                name: string;
                businessName: string | null;
            };
            product: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ItemStatus;
            updatedAt: Date;
            vendorId: string;
            productId: string;
            requestedQty: number;
            acceptedQty: number | null;
            vendorNote: string | null;
            respondedAt: Date | null;
            orderId: string;
        })[];
        customer: {
            id: string;
            name: string;
            businessName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        updatedAt: Date;
        note: string | null;
        customerId: string;
    })[]>;
    static getStats(): Promise<{
        users: {
            total: number;
            vendors: number;
            customers: number;
        };
        products: number;
        orders: {
            total: number;
            byStatus: {
                [k: string]: number;
            };
        };
    }>;
    static listCategories(): Promise<({
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
    static createCategory(name: string, attributes?: {
        name: string;
        sortOrder?: number;
    }[]): Promise<{
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
    }>;
    static updateCategory(id: string, name: string): Promise<{
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
    }>;
    static deleteCategory(id: string): Promise<{
        deleted: boolean;
    }>;
    static createCategoryAttribute(categoryId: string, name: string, sortOrder?: number): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        categoryId: string;
        sortOrder: number;
    }>;
    static updateCategoryAttribute(categoryId: string, attributeId: string, data: {
        name?: string;
        sortOrder?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        categoryId: string;
        sortOrder: number;
    }>;
    static deleteCategoryAttribute(categoryId: string, attributeId: string): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map