import { z } from 'zod';
export declare const createOrderDto: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: string;
        quantity: number;
    }, {
        productId: string;
        quantity: number;
    }>, "many">;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        productId: string;
        quantity: number;
    }[];
    note?: string | undefined;
}, {
    items: {
        productId: string;
        quantity: number;
    }[];
    note?: string | undefined;
}>;
export type CreateOrderDto = z.infer<typeof createOrderDto>;
//# sourceMappingURL=order.dto.d.ts.map