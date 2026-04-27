import { z } from 'zod';

export const vendorResponseDto = z
  .object({
    action: z.enum(['ACCEPT', 'REJECT', 'ALTER']),
    alteredQty: z.number().int().positive().optional(),
    note: z.string().optional(),
    offeredUnitPrice: z.number().positive().optional(),
  })
  .refine(
    (data) => data.action !== 'ALTER' || (data.alteredQty !== undefined && data.alteredQty > 0),
    { message: 'alteredQty is required when action is ALTER', path: ['alteredQty'] },
  );

export type VendorResponseDto = z.infer<typeof vendorResponseDto>;

export const vendorPriceCounterResponseDto = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
});

export type VendorPriceCounterResponseDto = z.infer<typeof vendorPriceCounterResponseDto>;

const bulkResponseItem = z
  .object({
    itemId: z.string().min(1),
    action: z.enum(['ACCEPT', 'REJECT', 'ALTER']),
    alteredQty: z.number().int().positive().optional(),
    offeredUnitPrice: z.number().positive().optional(),
    note: z.string().optional(),
  })
  .refine(
    (d) => d.action !== 'ALTER' || (d.alteredQty != null && d.alteredQty > 0),
    { message: 'alteredQty required for ALTER', path: ['alteredQty'] },
  );

export const vendorBulkRespondDto = z.object({
  responses: z.array(bulkResponseItem).min(1),
});

export type VendorBulkRespondDto = z.infer<typeof vendorBulkRespondDto>;
