"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.validateQuery = validateQuery;
function validate(schema) {
    return (req, _res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=validate.js.map