"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../services/product.service");
const product_dto_1 = require("../dto/product.dto");
const apiResponse_1 = require("../utils/apiResponse");
class ProductController {
    static async list(req, res, next) {
        try {
            const query = product_dto_1.productQueryDto.parse(req.query);
            const result = await product_service_1.ProductService.list(query);
            (0, apiResponse_1.success)(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const product = await product_service_1.ProductService.getById(req.params.id);
            (0, apiResponse_1.success)(res, product);
        }
        catch (err) {
            next(err);
        }
    }
    static async getMyProducts(req, res, next) {
        try {
            const products = await product_service_1.ProductService.getByVendor(req.user.id);
            (0, apiResponse_1.success)(res, products);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const product = await product_service_1.ProductService.create(req.user.id, req.body);
            (0, apiResponse_1.created)(res, product, 'Product created');
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const product = await product_service_1.ProductService.update(req.params.id, req.user.id, req.body);
            (0, apiResponse_1.success)(res, product, 'Product updated');
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            await product_service_1.ProductService.delete(req.params.id, req.user.id);
            (0, apiResponse_1.success)(res, null, 'Product deleted');
        }
        catch (err) {
            next(err);
        }
    }
    static async bulkDelete(req, res, next) {
        try {
            const result = await product_service_1.ProductService.bulkDelete(req.body.ids, req.user.id);
            (0, apiResponse_1.success)(res, result, `${result.deleted} product(s) deleted`);
        }
        catch (err) {
            next(err);
        }
    }
    static async getCategories(_req, res, next) {
        try {
            const categories = await product_service_1.ProductService.getCategories();
            (0, apiResponse_1.success)(res, categories);
        }
        catch (err) {
            next(err);
        }
    }
    static async getFilterOptions(_req, res, next) {
        try {
            const options = await product_service_1.ProductService.getFilterOptions();
            (0, apiResponse_1.success)(res, options);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ProductController = ProductController;
//# sourceMappingURL=product.controller.js.map