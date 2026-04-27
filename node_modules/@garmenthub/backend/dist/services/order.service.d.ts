import { CreateOrderDto } from '../dto/order.dto';
import { OrderStatus, ItemStatus } from '@prisma/client';
export declare class OrderService {
    static create(customerId: string, data: CreateOrderDto): Promise<{
        items: ({
            vendor: {
                id: string;
                name: string;
            };
            product: {
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
                attributeValues: import("@prisma/client/runtime/library").JsonValue;
                price: number | null;
                moq: number;
                vendorId: string;
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
    }>;
    static listForCustomer(customerId: string): Promise<({
        items: ({
            vendor: {
                id: string;
                name: string;
                businessName: string | null;
            };
            product: {
                id: string;
                name: string;
                images: string[];
                price: number | null;
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
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        updatedAt: Date;
        note: string | null;
        customerId: string;
    })[]>;
    static listForVendor(vendorId: string): Promise<({
        product: {
            id: string;
            name: string;
            images: string[];
            price: number | null;
        };
        order: {
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
    })[]>;
    static getById(id: string): Promise<{
        items: ({
            vendor: {
                id: string;
                name: string;
                businessName: string | null;
            };
            product: {
                id: string;
                name: string;
                images: string[];
                price: number | null;
                moq: number;
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
            phone: string;
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
    }>;
    static confirmOrder(orderId: string, customerId: string): Promise<{
        items: ({
            vendor: {
                id: string;
                name: string;
                businessName: string | null;
            };
            product: {
                id: string;
                name: string;
                images: string[];
                price: number | null;
                moq: number;
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
            phone: string;
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
    }>;
    static recalculateOrderStatus(items: {
        status: ItemStatus;
    }[]): OrderStatus;
}
//# sourceMappingURL=order.service.d.ts.map