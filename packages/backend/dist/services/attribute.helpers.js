"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndValidateAttributeValues = parseAndValidateAttributeValues;
exports.resolveLegacyColumns = resolveLegacyColumns;
exports.jsonToStringRecord = jsonToStringRecord;
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
async function parseAndValidateAttributeValues(vendorId, categoryId, raw) {
    if (raw === undefined || raw === null)
        return {};
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new errors_1.BadRequestError('attributeValues must be an object');
    }
    const obj = raw;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === '')
            continue;
        if (typeof v !== 'string')
            throw new errors_1.BadRequestError(`attributeValues.${k} must be a string`);
        out[k] = v;
    }
    const [catAttrs, vendAttrs] = await Promise.all([
        db_1.prisma.categoryAttribute.findMany({ where: { categoryId } }),
        db_1.prisma.vendorCategoryAttribute.findMany({ where: { vendorId, categoryId } }),
    ]);
    const allowed = new Set([...catAttrs.map((a) => a.id), ...vendAttrs.map((a) => a.id)]);
    for (const key of Object.keys(out)) {
        if (!allowed.has(key)) {
            throw new errors_1.BadRequestError(`Unknown attribute id: ${key}`);
        }
    }
    return out;
}
/** Sync legacy fabric/pattern/color columns from attribute values when attribute names match (for filters). */
function resolveLegacyColumns(catAttrs, values, fallback) {
    const byName = (n) => catAttrs.find((a) => a.name.toLowerCase() === n.toLowerCase());
    const fabricId = byName('fabric')?.id;
    const patternId = byName('pattern')?.id;
    const colorId = byName('color')?.id;
    return {
        fabric: fabricId && values[fabricId] !== undefined ? values[fabricId] : fallback.fabric,
        pattern: patternId && values[patternId] !== undefined ? values[patternId] : fallback.pattern,
        color: colorId && values[colorId] !== undefined ? values[colorId] : fallback.color,
    };
}
function jsonToStringRecord(raw) {
    if (raw === null || raw === undefined)
        return {};
    if (typeof raw !== 'object' || Array.isArray(raw))
        return {};
    const o = raw;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string')
            out[k] = v;
    }
    return out;
}
//# sourceMappingURL=attribute.helpers.js.map