import { z } from 'zod';

export const traderCounterPriceDto = z.object({
  unitPrice: z.number().positive(),
});

export type TraderCounterPriceDto = z.infer<typeof traderCounterPriceDto>;
