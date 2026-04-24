"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const product_dto_1 = require("../dto/product.dto");
exports.productRoutes = (0, express_1.Router)();
exports.productRoutes.get('/', product_controller_1.ProductController.list);
exports.productRoutes.get('/categories', product_controller_1.ProductController.getCategories);
exports.productRoutes.get('/filters', product_controller_1.ProductController.getFilterOptions);
exports.productRoutes.get('/my', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), product_controller_1.ProductController.getMyProducts);
exports.productRoutes.get('/:id', product_controller_1.ProductController.getById);
exports.productRoutes.post('/', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), (0, validate_1.validate)(product_dto_1.createProductDto), product_controller_1.ProductController.create);
exports.productRoutes.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), (0, validate_1.validate)(product_dto_1.updateProductDto), product_controller_1.ProductController.update);
exports.productRoutes.post('/bulk-delete', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), product_controller_1.ProductController.bulkDelete);
exports.productRoutes.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), product_controller_1.ProductController.delete);
//# sourceMappingURL=product.routes.js.map