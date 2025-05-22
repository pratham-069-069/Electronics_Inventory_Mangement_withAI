// src/controllers/return.controller.js
import pool from '../config/db.js';

export const getAllReturns = async (req, res) => {
    try {
        // Your existing getAllReturns query is good.
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
    const { sales_item_id, quantity_returned, return_reason, refund_amount: frontend_refund_amount } = req.body;
    const connection = await pool.getConnection(); // Get a connection from the pool for transaction

    console.log("Received add return request:", req.body);

    // Basic Input Validation
    if (!sales_item_id || !quantity_returned || !return_reason) {
        return res.status(400).json({ error: "Sales item ID, quantity returned, and return reason are required." });
    }
    if (isNaN(parseInt(quantity_returned)) || parseInt(quantity_returned) <= 0) {
        return res.status(400).json({ error: "Quantity returned must be a positive integer." });
    }
    if (frontend_refund_amount && (isNaN(parseFloat(frontend_refund_amount)) || parseFloat(frontend_refund_amount) < 0)) {
        return res.status(400).json({ error: "Refund amount must be a valid non-negative number." });
    }

    const parsedQuantityReturned = parseInt(quantity_returned);

    try {
        await connection.beginTransaction();

        // 1. Fetch the original sales item and product details
        const [salesItems] = await connection.query(
            `SELECT si.product_id, si.quantity_sold, si.unit_price, p.current_stock 
             FROM sales_items si
             JOIN products p ON si.product_id = p.product_id
             WHERE si.sales_item_id = ?`,
            [sales_item_id]
        );

        if (salesItems.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Original sales item not found." });
        }
        const salesItem = salesItems[0];

        // 2. Check if quantity returned is valid (not exceeding original quantity - previous returns for this item)
        //    This requires fetching previous returns for the same sales_item_id
        const [previousReturns] = await connection.query(
            `SELECT SUM(quantity_returned) as total_previously_returned 
             FROM returns_ 
             WHERE sales_item_id = ?`,
            [sales_item_id]
        );
        const totalPreviouslyReturned = previousReturns[0]?.total_previously_returned || 0;
        const maxReturnableQuantity = salesItem.quantity_sold - totalPreviouslyReturned;

        if (parsedQuantityReturned > maxReturnableQuantity) {
            await connection.rollback();
            return res.status(400).json({
                error: `Return quantity (${parsedQuantityReturned}) exceeds maximum returnable quantity (${maxReturnableQuantity}) for this item. Original: ${salesItem.quantity_sold}, Already Returned: ${totalPreviouslyReturned}.`
            });
        }

        // 3. Determine refund amount and initial status
        const calculatedRefundAmount = frontend_refund_amount !== undefined && frontend_refund_amount !== ""
            ? parseFloat(frontend_refund_amount)
            : salesItem.unit_price * parsedQuantityReturned; // Default calculation

        const initialReturnStatus = 'pending_inspection'; // Or 'pending_refund', 'completed' etc.

        // 4. Insert into RETURNS_ table
        const insertReturnQuery = `
            INSERT INTO returns_ (sales_item_id, quantity_returned, return_reason, refund_amount, return_status, return_date)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const [insertResult] = await connection.query(insertReturnQuery, [
            sales_item_id,
            parsedQuantityReturned,
            return_reason,
            calculatedRefundAmount.toFixed(2), // Ensure 2 decimal places
            initialReturnStatus
        ]);

        const newReturnId = insertResult.insertId;

        // 5. Update product stock
        const updateStockQuery = `
            UPDATE products
            SET current_stock = current_stock + ?
            WHERE product_id = ?
        `;
        await connection.query(updateStockQuery, [parsedQuantityReturned, salesItem.product_id]);

        await connection.commit();

        // Fetch the newly created return record to send back (optional, but good practice)
        const [newReturnRecord] = await connection.query(
             // Use a simplified version of getAllReturns query or just essential fields
            `SELECT r.*, p.product_name 
             FROM returns_ r 
             JOIN sales_items si ON r.sales_item_id = si.sales_item_id
             JOIN products p ON si.product_id = p.product_id
             WHERE r.return_id = ?`, [newReturnId]
        );


        res.status(201).json({ message: "Return processed successfully.", return: newReturnRecord[0] });

    } catch (error) {
        await connection.rollback();
        console.error("🚨 Error processing return:", error);
        res.status(500).json({ error: "Failed to process return due to an internal server error." });
    } finally {
        connection.release(); // Release the connection back to the pool
    }
};