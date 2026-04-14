import { z } from 'zod';

export const createOrderDto = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  note: z.string().optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderDto>;
