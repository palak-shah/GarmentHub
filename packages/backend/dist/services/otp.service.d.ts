export declare class OtpService {
    static generateCode(): string;
    static send(phone: string): Promise<{
        message: string;
    }>;
    static verify(phone: string, code: string): Promise<boolean>;
}
//# sourceMappingURL=otp.service.d.ts.map