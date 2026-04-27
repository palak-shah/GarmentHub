import { z } from 'zod';

/** Accept number, numeric string, omit, null, or '' — invalid / non-positive becomes undefined (store null via service). */
const optionalTraderOfferPrice = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}, z.number().positive().optional());

const shareLineSchema = z.object({
  productId: z.string().min(1),
  traderOfferUnitPrice: optionalTraderOfferPrice,
});

const nonEmptyStringArray = z.array(z.string().min(1));

export const createCuratedShareDto = z
  .object({
    productIds: z.preprocess((v) => (v == null ? undefined : v), nonEmptyStringArray.optional()),
    products: z.preprocess((v) => (v == null ? undefined : v), z.array(shareLineSchema).optional()),
    customerIds: z.preprocess(
      (v) => (v == null ? [] : v),
      nonEmptyStringArray.min(1, { message: 'Select at least one customer' }),
    ),
    note: z.string().optional(),
    orderMode: z.enum(['DIRECT', 'MANAGED']).optional(),
  })
  .superRefine((data, ctx) => {
    const lines =
      data.products && data.products.length > 0
        ? data.products
        : (data.productIds ?? []).map((productId) => ({ productId }));
    if (lines.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one product',
        path: ['products'],
      });
    }
  });

export type CreateCuratedShareDto = z.infer<typeof createCuratedShareDto>;

/** Normalized lines after validation. */
export type CuratedShareLineInput = z.infer<typeof shareLineSchema>;
