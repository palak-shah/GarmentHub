"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandController = void 0;
const brand_service_1 = require("../services/brand.service");
const apiResponse_1 = require("../utils/apiResponse");
class BrandController {
    static async listMy(req, res, next) {
        try {
            const brands = await brand_service_1.BrandService.listByVendor(req.user.id);
            (0, apiResponse_1.success)(res, brands);
        }
        catch (err) {
            next(err);
        }
    }
    static async listAll(_req, res, next) {
        try {
            const brands = await brand_service_1.BrandService.listAll();
            (0, apiResponse_1.success)(res, brands);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const brand = await brand_service_1.BrandService.create(req.user.id, req.body);
            (0, apiResponse_1.created)(res, brand, 'Brand created');
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const brand = await brand_service_1.BrandService.update(req.params.id, req.user.id, req.body);
            (0, apiResponse_1.success)(res, brand, 'Brand updated');
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            await brand_service_1.BrandService.delete(req.params.id, req.user.id);
            (0, apiResponse_1.success)(res, null, 'Brand deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.BrandController = BrandController;
//# sourceMappingURL=brand.controller.js.map