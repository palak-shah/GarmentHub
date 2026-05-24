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
  /** Share a specific vendor photo (from product timeline). */
  productImageId: z.string().min(1).optional(),
});

const nonEmptyStringArray = z.array(z.string().min(1));

const stringIdArray = z.preprocess((v) => (v == null ? [] : v), z.array(z.string().min(1)));

export const createCuratedShareDto = z
  .object({
    productIds: z.preprocess((v) => (v == null ? undefined : v), nonEmptyStringArray.optional()),
    products: z.preprocess((v) => (v == null ? undefined : v), z.array(shareLineSchema).optional()),
    customerIds: stringIdArray,
    customerGroupIds: stringIdArray,
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
    if (data.customerIds.length === 0 && data.customerGroupIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one customer or customer group',
        path: ['customerIds'],
      });
    }
  });

export type CreateCuratedShareDto = z.infer<typeof createCuratedShareDto>;

/** Normalized lines after validation. */
export type CuratedShareLineInput = z.infer<typeof shareLineSchema>;

export const createCustomerGroupDto = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateCustomerGroupDto = z.object({
  name: z.string().trim().min(1).max(120),
});

export const addGroupMembersDto = z.object({
  customerIds: z.array(z.string().min(1)).min(1),
});

export type CreateCustomerGroupBody = z.infer<typeof createCustomerGroupDto>;
export type UpdateCustomerGroupBody = z.infer<typeof updateCustomerGroupDto>;
export type AddGroupMembersBody = z.infer<typeof addGroupMembersDto>;
