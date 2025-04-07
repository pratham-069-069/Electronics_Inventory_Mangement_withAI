import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        // Use Promise.all for concurrent queries - Added queries for orders, users, reports
        const [
            totalProductsRes,
            activeSuppliersRes,
            lowStockAlertsRes,
            totalSalesRes,
            totalOrdersRes,   // <-- New Result Variable
            totalUsersRes,    // <-- New Result Variable
            totalReportsRes   // <-- New Result Variable
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) AS count FROM products"),
            pool.query("SELECT COUNT(*) AS count FROM suppliers"), // Define what 'active' means if needed (currently just total count)
            pool.query("SELECT COUNT(*) AS count FROM inventory_alerts WHERE alert_type = 'low_stock'"),
            pool.query("SELECT SUM(total_amount) AS sum FROM sales WHERE payment_status = 'completed'"), // Example: sum completed sales
            pool.query("SELECT COUNT(*) AS count FROM purchase_orders"), // <-- New Query for Purchase Orders
            pool.query("SELECT COUNT(*) AS count FROM users"),          // <-- New Query for Users
            pool.query("SELECT COUNT(*) AS count FROM reports")          // <-- New Query for Reports
        ]);

        // Construct the response object including the new stats
        res.json({
            totalProducts: parseInt(totalProductsRes.rows[0].count, 10),
            activeSuppliers: parseInt(activeSuppliersRes.rows[0].count, 10),
            lowStockAlerts: parseInt(lowStockAlertsRes.rows[0].count, 10),
            totalSales: parseFloat(totalSalesRes.rows[0].sum || 0).toFixed(2), // Handle null sum, format
            totalOrders: parseInt(totalOrdersRes.rows[0].count, 10),     // <-- Add totalOrders count
            totalUsers: parseInt(totalUsersRes.rows[0].count, 10),       // <-- Add totalUsers count
            totalReports: parseInt(totalReportsRes.rows[0].count, 10)    // <-- Add totalReports count
        });
    } catch (error) {
        console.error("🚨 Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
};