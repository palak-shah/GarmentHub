"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const apiResponse_1 = require("../utils/apiResponse");
class AuthController {
    static async sendOtp(req, res, next) {
        try {
            const result = await auth_service_1.AuthService.sendOtp(req.body.phone);
            (0, apiResponse_1.success)(res, result, 'OTP sent');
        }
        catch (err) {
            next(err);
        }
    }
    static async verifyOtp(req, res, next) {
        try {
            const result = await auth_service_1.AuthService.verifyOtp(req.body.phone, req.body.code);
            (0, apiResponse_1.success)(res, result, 'Login successful');
        }
        catch (err) {
            next(err);
        }
    }
    static async getProfile(req, res, next) {
        try {
            const user = await auth_service_1.AuthService.getProfile(req.user.id);
            (0, apiResponse_1.success)(res, user);
        }
        catch (err) {
            next(err);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            const user = await auth_service_1.AuthService.updateProfile(req.user.id, req.body);
            (0, apiResponse_1.success)(res, user, 'Profile updated');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map