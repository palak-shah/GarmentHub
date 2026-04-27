"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const uploadPaths_1 = require("./config/uploadPaths");
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = require("./routes/auth.routes");
const product_routes_1 = require("./routes/product.routes");
const order_routes_1 = require("./routes/order.routes");
const vendor_routes_1 = require("./routes/vendor.routes");
const admin_routes_1 = require("./routes/admin.routes");
const brand_routes_1 = require("./routes/brand.routes");
const upload_routes_1 = require("./routes/upload.routes");
const app = (0, express_1.default)();
(0, uploadPaths_1.ensureUploadDirs)();
app.use((0, cors_1.default)());
app.use('/uploads', express_1.default.static(uploadPaths_1.UPLOADS_ROOT));
// Multipart uploads must run before express.json() (belt-and-suspenders for body parsing).
app.use('/api/upload', upload_routes_1.uploadRoutes);
app.use(express_1.default.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_routes_1.authRoutes);
app.use('/api/products', product_routes_1.productRoutes);
app.use('/api/orders', order_routes_1.orderRoutes);
app.use('/api/vendor', vendor_routes_1.vendorRoutes);
app.use('/api/admin', admin_routes_1.adminRoutes);
app.use('/api/brands', brand_routes_1.brandRoutes);
app.use(errorHandler_1.errorHandler);
app.listen(env_1.env.port, () => {
    console.log(`GarmentHub API running on port ${env_1.env.port}`);
});
//# sourceMappingURL=index.js.map