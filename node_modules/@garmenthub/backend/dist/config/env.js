"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    port: parseInt(process.env.PORT || '4000', 10),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
    otpExpiryMinutes: 5,
};
//# sourceMappingURL=env.js.map