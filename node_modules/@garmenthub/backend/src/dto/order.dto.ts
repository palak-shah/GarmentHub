import { z } from 'zod';

function utcYmdToday(): string {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, '0');
  const d = String(n.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM-DD` from API → end of that calendar day in UTC (matches DB storage). */
export function customerNeedByYmdToEndOfUtcDay(ymd: string): Date {
  const [y, mo, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
}

export const createOrderDto = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.coerce.number().int().positive(),
        }),
      )
      .min(1),
    traderId: z
      .preprocess((v) => (v === null || v === '' ? undefined : v), z.string().min(1).optional()),
    orderMode: z.enum(['DIRECT', 'MANAGED']).optional(),
    note: z.string().optional(),
    customerNeedBy: z
      .preprocess(
        (v) => (v === null || v === '' || v === undefined ? undefined : String(v).trim()),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      ),
  })
  .superRefine((data, ctx) => {
    if (data.customerNeedBy && data.customerNeedBy < utcYmdToday()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Need-by date cannot be in the past',
        path: ['customerNeedBy'],
      });
    }
  });

export type CreateOrderDto = z.infer<typeof createOrderDto>;

export const modifyOrderItemsDto = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        requestedQty: z.number().int().positive(),
      }),
    )
    .min(1),
});

export type ModifyOrderItemsDto = z.infer<typeof modifyOrderItemsDto>;

/** Trader may update line quantities and/or order note before or (for direct) until vendors respond. */
export const traderAdjustOrderDto = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        requestedQty: z.coerce.number().int().positive().optional(),
        /** Trader's favored unit price: managed pre-vendor send, or while every line is still PENDING (e.g. direct). Null clears. Omitted = unchanged. */
        unitPrice: z
          .union([
            z.null(),
            z.coerce.number().refine((n) => Number.isFinite(n) && n > 0, 'Must be a finite positive number'),
          ])
          .optional(),
      }),
    )
    .optional(),
  note: z.string().nullable().optional(),
});
export type TraderAdjustOrderDto = z.infer<typeof traderAdjustOrderDto>;
