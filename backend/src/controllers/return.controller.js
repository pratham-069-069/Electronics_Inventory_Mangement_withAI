// src/controllers/return.controller.js
import pool from '../config/db.js';

/**
 * @description Get all return records with joined details (product, sale, customer)
 * @route GET /api/returns
 */
export const getAllReturns = async (req, res) => {
    // Consider adding filtering query parameters (e.g., ?productId=, ?customerId=, ?status=) later
    try {
        // Query to join returns_ with sales_items, products, sales, and customers
        const query = `
            SELECT
                r.return_id,
                r.sales_item_id,
                si.sales_id,             -- Get Sales ID from sales_items
                si.product_id,           -- Get Product ID from sales_items
                COALESCE(p.product_name, 'Unknown Product') as product_name, -- Get Product Name
                s.sale_date,             -- Get original Sale Date
                s.customer_id,           -- Get Customer ID from sales
                COALESCE(c.full_name, 'N/A') as customer_name, -- Get Customer Name
                r.quantity_returned,
                r.return_reason,
                r.refund_amount,
                r.return_status,
                r.return_date
            FROM returns_ r             -- Use alias 'r' for returns_ table
            JOIN sales_items si ON r.sales_item_id = si.sales_item_id
            JOIN products p ON si.product_id = p.product_id
            JOIN sales s ON si.sales_id = s.sales_id
            LEFT JOIN customers c ON s.customer_id = c.customer_id -- LEFT JOIN in case customer is null
            ORDER BY r.return_date DESC, r.return_id DESC;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error("🚨 Error fetching returns:", error);
        res.status(500).json({ error: "Failed to fetch return records due to an internal server error." });
    }
};

// --- Placeholder for Add Return functionality (Implement later) ---
/**
 * @description Add a new return (requires more complex logic)
 * @route POST /api/returns
 */
export const addReturn = async (req, res) => {
     // Basic structure - Full implementation needed later
     const { sales_item_id, quantity_returned, return_reason } = req.body;
     console.log("Received add return request (backend implementation pending):", req.body);
     // TODO: Implement transaction logic:
     // 1. Validate sales_item_id exists and quantity is valid.
     // 2. Get original item details (price, product_id).
     // 3. Calculate refund amount.
     // 4. INSERT into returns_.
     // 5. UPDATE product stock (increase).
     // 6. INSERT into stock_transactions.
     res.status(501).json({ message: "Add return endpoint not fully implemented yet." });
};