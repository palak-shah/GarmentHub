"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileDto = exports.verifyOtpDto = exports.sendOtpDto = void 0;
const zod_1 = require("zod");
exports.sendOtpDto = zod_1.z.object({
    phone: zod_1.z.string().min(10).max(15),
});
exports.verifyOtpDto = zod_1.z.object({
    phone: zod_1.z.string().min(10).max(15),
    code: zod_1.z.string().length(6),
});
exports.updateProfileDto = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    businessName: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
});
//# sourceMappingURL=auth.dto.js.map