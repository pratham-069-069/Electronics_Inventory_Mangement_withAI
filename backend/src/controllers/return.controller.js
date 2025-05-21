// src/controllers/return.controller.js
import pool from '../config/db.js';

export const getAllReturns = async (req, res) => {
    try {
        const query = `
            SELECT
                r.return_id,
                r.sales_item_id,
                si.sales_id,
                si.product_id,
                COALESCE(p.product_name, 'Unknown Product') as product_name,
                s.sale_date,
                s.customer_id,
                COALESCE(c.full_name, 'N/A') as customer_name,
                r.quantity_returned,
                r.return_reason,
                r.refund_amount,
                r.return_status,
                r.return_date
            FROM returns_ r
            JOIN sales_items si ON r.sales_item_id = si.sales_item_id
            JOIN products p ON si.product_id = p.product_id
            JOIN sales s ON si.sales_id = s.sales_id
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            ORDER BY r.return_date DESC, r.return_id DESC;
        `;
        const [results] = await pool.query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching returns:", error);
        res.status(500).json({ error: "Failed to fetch return records due to an internal server error." });
    }
};

export const addReturn = async (req, res) => {
     const { sales_item_id, quantity_returned, return_reason } = req.body;
     console.log("Received add return request (backend implementation pending):", req.body);
     // TODO: Implement full MySQL transaction logic here
     res.status(501).json({ message: "Add return endpoint not fully implemented yet for MySQL." });
};