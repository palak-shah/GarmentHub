"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandRoutes = void 0;
const express_1 = require("express");
const brand_controller_1 = require("../controllers/brand.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const brand_dto_1 = require("../dto/brand.dto");
exports.brandRoutes = (0, express_1.Router)();
exports.brandRoutes.get('/', brand_controller_1.BrandController.listAll);
exports.brandRoutes.get('/my', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), brand_controller_1.BrandController.listMy);
exports.brandRoutes.post('/', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), (0, validate_1.validate)(brand_dto_1.createBrandDto), brand_controller_1.BrandController.create);
exports.brandRoutes.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), (0, validate_1.validate)(brand_dto_1.updateBrandDto), brand_controller_1.BrandController.update);
exports.brandRoutes.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('VENDOR'), brand_controller_1.BrandController.delete);
//# sourceMappingURL=brand.routes.js.map