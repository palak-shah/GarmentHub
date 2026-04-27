import { UpdateProfileDto } from '../dto/auth.dto';
export declare class AuthService {
    static sendOtp(phone: string): Promise<{
        message: string;
    }>;
    static verifyOtp(phone: string, code: string): Promise<{
        token: string;
        user: {
            phone: string;
            id: string;
            createdAt: Date;
            name: string;
            businessName: string | null;
            address: string | null;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            updatedAt: Date;
        };
        isNewUser: boolean;
    }>;
    static getProfile(userId: string): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        businessName: string | null;
        address: string | null;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    static updateProfile(userId: string, data: UpdateProfileDto): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        businessName: string | null;
        address: string | null;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map