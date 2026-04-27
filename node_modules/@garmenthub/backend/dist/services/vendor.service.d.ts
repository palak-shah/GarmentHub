import { VendorResponseDto } from '../dto/vendor.dto';
export declare class VendorService {
    static respondToItem(itemId: string, vendorId: string, data: VendorResponseDto): Promise<{
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
    }>;
}
//# sourceMappingURL=vendor.service.d.ts.map