import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { ensureUploadDirs, UPLOADS_ROOT } from './config/uploadPaths';
import { buildCorsOptions } from './config/corsOptions';
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

app.use(cors(buildCorsOptions()));
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

const server = app.listen(env.port, () => {
  console.log(`GarmentHub API running on port ${env.port}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${env.port} is already in use — another process (often a previous API run) still holds it.\n`,
      `Close that terminal tab or stop the other Node process, then try again.\n`,
      `Windows:  netstat -ano | findstr :${env.port}   then   taskkill /PID <pid> /F\n`,
    );
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
