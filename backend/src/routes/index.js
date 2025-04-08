// src/routes/index.js
import { Router } from 'express';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import supplierRoutes from './supplier.routes.js';
import saleRoutes from './sale.routes.js';
import purchaseOrderRoutes from './purchaseOrder.routes.js';
// Report routes should be removed
import inventoryAlertRoutes from './inventoryAlert.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import chatbotRoutes from './chatbot.routes.js';
import categoryRoutes from './category.routes.js';
import billingRoutes from './billing.routes.js';
import returnRoutes from './return.routes.js'; // <-- Import return routes

const router = Router();

// Mount resource routers
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales', saleRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
// No report routes
router.use('/inventory-alerts', inventoryAlertRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/product-categories', categoryRoutes);
router.use('/billing', billingRoutes);
router.use('/returns', returnRoutes); // <-- Mount return routes

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

export default router;