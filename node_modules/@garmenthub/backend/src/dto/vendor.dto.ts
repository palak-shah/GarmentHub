import { z } from 'zod';

export const vendorResponseDto = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'ALTER']),
  alteredQty: z.number().int().positive().optional(),
  note: z.string().optional(),
}).refine(
  (data) => data.action !== 'ALTER' || (data.alteredQty !== undefined && data.alteredQty > 0),
  { message: 'alteredQty is required when action is ALTER', path: ['alteredQty'] },
);

export type VendorResponseDto = z.infer<typeof vendorResponseDto>;
