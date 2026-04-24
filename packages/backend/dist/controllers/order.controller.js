"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../services/order.service");
const apiResponse_1 = require("../utils/apiResponse");
class OrderController {
    static async create(req, res, next) {
        try {
            const order = await order_service_1.OrderService.create(req.user.id, req.body);
            (0, apiResponse_1.created)(res, order, 'Order placed');
        }
        catch (err) {
            next(err);
        }
    }
    static async list(req, res, next) {
        try {
            const role = req.user.role;
            let orders;
            if (role === 'VENDOR') {
                orders = await order_service_1.OrderService.listForVendor(req.user.id);
            }
            else {
                orders = await order_service_1.OrderService.listForCustomer(req.user.id);
            }
            (0, apiResponse_1.success)(res, orders);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const order = await order_service_1.OrderService.getById(req.params.id);
            (0, apiResponse_1.success)(res, order);
        }
        catch (err) {
            next(err);
        }
    }
    static async confirm(req, res, next) {
        try {
            const order = await order_service_1.OrderService.confirmOrder(req.params.id, req.user.id);
            (0, apiResponse_1.success)(res, order, 'Order confirmed');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.OrderController = OrderController;
//# sourceMappingURL=order.controller.js.map