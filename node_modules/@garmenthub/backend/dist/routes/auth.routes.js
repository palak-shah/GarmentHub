"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_dto_1 = require("../dto/auth.dto");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post('/send-otp', (0, validate_1.validate)(auth_dto_1.sendOtpDto), auth_controller_1.AuthController.sendOtp);
exports.authRoutes.post('/verify-otp', (0, validate_1.validate)(auth_dto_1.verifyOtpDto), auth_controller_1.AuthController.verifyOtp);
exports.authRoutes.get('/me', auth_1.authenticate, auth_controller_1.AuthController.getProfile);
exports.authRoutes.put('/me', auth_1.authenticate, (0, validate_1.validate)(auth_dto_1.updateProfileDto), auth_controller_1.AuthController.updateProfile);
//# sourceMappingURL=auth.routes.js.map