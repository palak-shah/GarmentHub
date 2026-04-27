import { z } from 'zod';
export declare const vendorResponseDto: z.ZodEffects<z.ZodObject<{
    action: z.ZodEnum<["ACCEPT", "REJECT", "ALTER"]>;
    alteredQty: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "ACCEPT" | "REJECT" | "ALTER";
    note?: string | undefined;
    alteredQty?: number | undefined;
}, {
    action: "ACCEPT" | "REJECT" | "ALTER";
    note?: string | undefined;
    alteredQty?: number | undefined;
}>, {
    action: "ACCEPT" | "REJECT" | "ALTER";
    note?: string | undefined;
    alteredQty?: number | undefined;
}, {
    action: "ACCEPT" | "REJECT" | "ALTER";
    note?: string | undefined;
    alteredQty?: number | undefined;
}>;
export type VendorResponseDto = z.infer<typeof vendorResponseDto>;
//# sourceMappingURL=vendor.dto.d.ts.map