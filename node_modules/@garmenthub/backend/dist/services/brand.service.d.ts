import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';
export declare class BrandService {
    static listByVendor(vendorId: string): Promise<({
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        vendorId: string;
    })[]>;
    static listAll(): Promise<({
        vendor: {
            id: string;
            name: string;
            businessName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        vendorId: string;
    })[]>;
    static create(vendorId: string, data: CreateBrandDto): Promise<{
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        vendorId: string;
    }>;
    static update(id: string, vendorId: string, data: UpdateBrandDto): Promise<{
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        vendorId: string;
    }>;
    static delete(id: string, vendorId: string): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=brand.service.d.ts.map