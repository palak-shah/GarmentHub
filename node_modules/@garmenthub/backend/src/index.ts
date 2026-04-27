import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { ensureUploadDirs, UPLOADS_ROOT } from './config/uploadPaths';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { orderRoutes } from './routes/order.routes';
import { vendorRoutes } from './routes/vendor.routes';
import { adminRoutes } from './routes/admin.routes';
import { brandRoutes } from './routes/brand.routes';
import { uploadRoutes } from './routes/upload.routes';
import { networkRoutes } from './routes/network.routes';
import { curationRoutes } from './routes/curation.routes';
import { workflowRoutes } from './routes/workflow.routes';
import { notificationRoutes } from './routes/notification.routes';

const app = express();

ensureUploadDirs();

app.use(cors());
app.use('/uploads', express.static(UPLOADS_ROOT));
// Multipart uploads must run before express.json() (belt-and-suspenders for body parsing).
app.use('/api/upload', uploadRoutes);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/curation', curationRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`GarmentHub API running on port ${env.port}`);
});
