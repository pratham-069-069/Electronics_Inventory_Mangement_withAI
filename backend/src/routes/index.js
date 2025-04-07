// src/routes/index.js
import { Router } from 'express';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import supplierRoutes from './supplier.routes.js';
import saleRoutes from './sale.routes.js';
import purchaseOrderRoutes from './purchaseOrder.routes.js';
// import reportRoutes from './report.routes.js'; // <-- REMOVE/COMMENT OUT
import inventoryAlertRoutes from './inventoryAlert.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import chatbotRoutes from './chatbot.routes.js';
import categoryRoutes from './category.routes.js';
import billingRoutes from './billing.routes.js'; // <-- ADD Import for Billing

const router = Router();

// Mount resource routers
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales', saleRoutes); // Keep this for the main sales list
router.use('/purchase-orders', purchaseOrderRoutes);
// router.use('/reports', reportRoutes); // <-- REMOVE/COMMENT OUT
router.use('/inventory-alerts', inventoryAlertRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/product-categories', categoryRoutes);
router.use('/billing', billingRoutes); // <-- ADD Mount Billing Routes

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

export default router;