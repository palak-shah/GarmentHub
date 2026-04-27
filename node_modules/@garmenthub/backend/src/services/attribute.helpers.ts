import { prisma } from '../config/db';
import { BadRequestError } from '../utils/errors';
import type { Prisma } from '@prisma/client';

export async function parseAndValidateAttributeValues(
  vendorId: string,
  categoryId: string,
  raw: unknown,
): Promise<Prisma.InputJsonValue> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BadRequestError('attributeValues must be an object');
  }
  const obj = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') throw new BadRequestError(`attributeValues.${k} must be a string`);
    out[k] = v;
  }

  const [catAttrs, vendAttrs] = await Promise.all([
    prisma.categoryAttribute.findMany({ where: { categoryId } }),
    prisma.vendorCategoryAttribute.findMany({ where: { vendorId, categoryId } }),
  ]);
  const allowed = new Set([...catAttrs.map((a) => a.id), ...vendAttrs.map((a) => a.id)]);
  for (const key of Object.keys(out)) {
    if (!allowed.has(key)) {
      throw new BadRequestError(`Unknown attribute id: ${key}`);
    }
  }
  return out as Prisma.InputJsonValue;
}

/** Sync legacy fabric/pattern/color columns from attribute values when attribute names match (for filters). */
export function resolveLegacyColumns(
  catAttrs: { id: string; name: string }[],
  values: Record<string, string>,
  fallback: { fabric: string; pattern: string; color: string },
): { fabric: string; pattern: string; color: string } {
  const byName = (n: string) =>
    catAttrs.find((a) => a.name.toLowerCase() === n.toLowerCase());
  const fabricId = byName('fabric')?.id;
  const patternId = byName('pattern')?.id;
  const colorId = byName('color')?.id;
  return {
    fabric:
      fabricId && values[fabricId] !== undefined ? values[fabricId] : fallback.fabric,
    pattern:
      patternId && values[patternId] !== undefined ? values[patternId] : fallback.pattern,
    color: colorId && values[colorId] !== undefined ? values[colorId] : fallback.color,
  };
}

export function jsonToStringRecord(raw: unknown): Record<string, string> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}
