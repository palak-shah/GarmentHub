"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorRoutes = void 0;
const express_1 = require("express");
const vendor_controller_1 = require("../controllers/vendor.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const vendor_dto_1 = require("../dto/vendor.dto");
const category_dto_1 = require("../dto/category.dto");
exports.vendorRoutes = (0, express_1.Router)();
exports.vendorRoutes.use(auth_1.authenticate, (0, auth_1.authorize)('VENDOR'));
exports.vendorRoutes.get('/orders', vendor_controller_1.VendorController.getIncomingOrders);
exports.vendorRoutes.put('/orders/items/:itemId/respond', (0, validate_1.validate)(vendor_dto_1.vendorResponseDto), vendor_controller_1.VendorController.respondToItem);
exports.vendorRoutes.get('/categories', vendor_controller_1.VendorController.listCategories);
exports.vendorRoutes.post('/categories/:categoryId/attributes', (0, validate_1.validate)(category_dto_1.createVendorCategoryAttributeDto), vendor_controller_1.VendorController.createVendorAttribute);
exports.vendorRoutes.put('/categories/:categoryId/attributes/:attributeId', (0, validate_1.validate)(category_dto_1.updateVendorCategoryAttributeDto), vendor_controller_1.VendorController.updateVendorAttribute);
exports.vendorRoutes.delete('/categories/:categoryId/attributes/:attributeId', vendor_controller_1.VendorController.deleteVendorAttribute);
//# sourceMappingURL=vendor.routes.js.map