import type { Prisma } from '@prisma/client';
export declare function parseAndValidateAttributeValues(vendorId: string, categoryId: string, raw: unknown): Promise<Prisma.InputJsonValue>;
/** Sync legacy fabric/pattern/color columns from attribute values when attribute names match (for filters). */
export declare function resolveLegacyColumns(catAttrs: {
    id: string;
    name: string;
}[], values: Record<string, string>, fallback: {
    fabric: string;
    pattern: string;
    color: string;
}): {
    fabric: string;
    pattern: string;
    color: string;
};
export declare function jsonToStringRecord(raw: unknown): Record<string, string>;
//# sourceMappingURL=attribute.helpers.d.ts.map