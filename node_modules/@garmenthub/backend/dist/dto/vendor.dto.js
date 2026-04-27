"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorResponseDto = void 0;
const zod_1 = require("zod");
exports.vendorResponseDto = zod_1.z.object({
    action: zod_1.z.enum(['ACCEPT', 'REJECT', 'ALTER']),
    alteredQty: zod_1.z.number().int().positive().optional(),
    note: zod_1.z.string().optional(),
}).refine((data) => data.action !== 'ALTER' || (data.alteredQty !== undefined && data.alteredQty > 0), { message: 'alteredQty is required when action is ALTER', path: ['alteredQty'] });
//# sourceMappingURL=vendor.dto.js.map