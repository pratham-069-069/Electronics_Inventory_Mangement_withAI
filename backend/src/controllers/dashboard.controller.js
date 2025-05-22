import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        // Use Promise.all for concurrent queries
        const [
            [totalProductsRes], // Destructure to get the rows array directly
            [activeSuppliersRes],
            [lowStockAlertsRes],
            [totalSalesRes],
            [totalOrdersRes],
            [totalUsersRes],
            // [totalReportsRes]
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) AS count FROM products"),
            pool.query("SELECT COUNT(*) AS count FROM suppliers"),
            pool.query("SELECT COUNT(*) AS count FROM inventory_alerts WHERE alert_type = 'low_stock'"),
            pool.query("SELECT SUM(total_amount) AS sum FROM sales WHERE payment_status = 'completed'"),
            pool.query("SELECT COUNT(*) AS count FROM purchase_orders"),
            pool.query("SELECT COUNT(*) AS count FROM users"),
            // pool.query("SELECT COUNT(*) AS count FROM reports")
        ]);

        // Construct the response object
        res.json({
            totalProducts: parseInt(totalProductsRes[0].count, 10),
            activeSuppliers: parseInt(activeSuppliersRes[0].count, 10),
            lowStockAlerts: parseInt(lowStockAlertsRes[0].count, 10),
            totalSales: parseFloat(totalSalesRes[0].sum || 0).toFixed(2),
            totalOrders: parseInt(totalOrdersRes[0].count, 10),
            totalUsers: parseInt(totalUsersRes[0].count, 10),
            // totalReports: parseInt(totalReportsRes[0].count, 10)
        });
    } catch (error) {
        console.error("🚨 Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
};