"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorController = void 0;
const vendor_service_1 = require("../services/vendor.service");
const order_service_1 = require("../services/order.service");
const catalog_service_1 = require("../services/catalog.service");
const apiResponse_1 = require("../utils/apiResponse");
class VendorController {
    static async getIncomingOrders(req, res, next) {
        try {
            const items = await order_service_1.OrderService.listForVendor(req.user.id);
            (0, apiResponse_1.success)(res, items);
        }
        catch (err) {
            next(err);
        }
    }
    static async respondToItem(req, res, next) {
        try {
            const result = await vendor_service_1.VendorService.respondToItem(req.params.itemId, req.user.id, req.body);
            (0, apiResponse_1.success)(res, result, 'Response recorded');
        }
        catch (err) {
            next(err);
        }
    }
    static async listCategories(req, res, next) {
        try {
            const categories = await catalog_service_1.CatalogService.listCategoriesForVendor(req.user.id);
            (0, apiResponse_1.success)(res, categories);
        }
        catch (err) {
            next(err);
        }
    }
    static async createVendorAttribute(req, res, next) {
        try {
            const row = await catalog_service_1.CatalogService.createVendorAttribute(req.user.id, req.params.categoryId, req.body.name, req.body.sortOrder);
            (0, apiResponse_1.created)(res, row, 'Attribute created');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateVendorAttribute(req, res, next) {
        try {
            const row = await catalog_service_1.CatalogService.updateVendorAttribute(req.user.id, req.params.categoryId, req.params.attributeId, req.body);
            (0, apiResponse_1.success)(res, row, 'Attribute updated');
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteVendorAttribute(req, res, next) {
        try {
            await catalog_service_1.CatalogService.deleteVendorAttribute(req.user.id, req.params.categoryId, req.params.attributeId);
            (0, apiResponse_1.success)(res, null, 'Attribute deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VendorController = VendorController;
//# sourceMappingURL=vendor.controller.js.map