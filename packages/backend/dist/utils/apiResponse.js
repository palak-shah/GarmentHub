"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.created = created;
exports.fail = fail;
function success(res, data = null, message = 'Success', status = 200) {
    return res.status(status).json({ success: true, data, message });
}
function created(res, data, message = 'Created') {
    return success(res, data, message, 201);
}
function fail(res, error, status = 400, details) {
    return res.status(status).json({ success: false, error, details });
}
//# sourceMappingURL=apiResponse.js.map