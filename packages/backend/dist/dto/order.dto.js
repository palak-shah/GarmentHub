"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderDto = void 0;
const zod_1 = require("zod");
exports.createOrderDto = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().positive(),
    })).min(1),
    note: zod_1.z.string().optional(),
});
//# sourceMappingURL=order.dto.js.map