"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
const apiResponse_1 = require("../utils/apiResponse");
class AdminController {
    static async getUsers(req, res, next) {
        try {
            const users = await admin_service_1.AdminService.getUsers(req.query.role);
            (0, apiResponse_1.success)(res, users);
        }
        catch (err) {
            next(err);
        }
    }
    static async toggleUserStatus(req, res, next) {
        try {
            const user = await admin_service_1.AdminService.toggleUserStatus(req.params.id, req.body.isActive);
            (0, apiResponse_1.success)(res, user, 'User updated');
        }
        catch (err) {
            next(err);
        }
    }
    static async getAllOrders(_req, res, next) {
        try {
            const orders = await admin_service_1.AdminService.getAllOrders();
            (0, apiResponse_1.success)(res, orders);
        }
        catch (err) {
            next(err);
        }
    }
    static async getStats(_req, res, next) {
        try {
            const stats = await admin_service_1.AdminService.getStats();
            (0, apiResponse_1.success)(res, stats);
        }
        catch (err) {
            next(err);
        }
    }
    static async listCategories(_req, res, next) {
        try {
            const categories = await admin_service_1.AdminService.listCategories();
            (0, apiResponse_1.success)(res, categories);
        }
        catch (err) {
            next(err);
        }
    }
    static async createCategory(req, res, next) {
        try {
            const category = await admin_service_1.AdminService.createCategory(req.body.name, req.body.attributes);
            (0, apiResponse_1.created)(res, category, 'Category created');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateCategory(req, res, next) {
        try {
            const category = await admin_service_1.AdminService.updateCategory(req.params.id, req.body.name);
            (0, apiResponse_1.success)(res, category, 'Category updated');
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteCategory(req, res, next) {
        try {
            await admin_service_1.AdminService.deleteCategory(req.params.id);
            (0, apiResponse_1.success)(res, null, 'Category deleted');
        }
        catch (err) {
            next(err);
        }
    }
    static async createCategoryAttribute(req, res, next) {
        try {
            const row = await admin_service_1.AdminService.createCategoryAttribute(req.params.categoryId, req.body.name, req.body.sortOrder);
            (0, apiResponse_1.created)(res, row, 'Attribute created');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateCategoryAttribute(req, res, next) {
        try {
            const row = await admin_service_1.AdminService.updateCategoryAttribute(req.params.categoryId, req.params.attributeId, req.body);
            (0, apiResponse_1.success)(res, row, 'Attribute updated');
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteCategoryAttribute(req, res, next) {
        try {
            await admin_service_1.AdminService.deleteCategoryAttribute(req.params.categoryId, req.params.attributeId);
            (0, apiResponse_1.success)(res, null, 'Attribute deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map