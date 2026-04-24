"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = void 0;
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const order_dto_1 = require("../dto/order.dto");
exports.orderRoutes = (0, express_1.Router)();
exports.orderRoutes.use(auth_1.authenticate);
exports.orderRoutes.post('/', (0, auth_1.authorize)('CUSTOMER'), (0, validate_1.validate)(order_dto_1.createOrderDto), order_controller_1.OrderController.create);
exports.orderRoutes.get('/', order_controller_1.OrderController.list);
exports.orderRoutes.get('/:id', order_controller_1.OrderController.getById);
exports.orderRoutes.post('/:id/confirm', (0, auth_1.authorize)('CUSTOMER'), order_controller_1.OrderController.confirm);
//# sourceMappingURL=order.routes.js.map