// src/controllers/purchaseOrder.controller.js
import pool from '../config/db.js';

export const getAllPurchaseOrders = async (req, res) => {
    try {
        // ✅ *** Confirmed: No expected_delivery_date or actual_delivery_date based on schema ***
        const result = await pool.query(`
            SELECT
                po.order_id, po.supplier_id, s.supplier_name,
                po.product_id, p.product_name, po.quantity_ordered,
                po.order_status, po.order_date
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN products p ON po.product_id = p.product_id
            ORDER BY po.order_date DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching purchase orders:", error);
        res.status(500).json({ error: "Error fetching purchase orders from the database." });
    }
};

export const addPurchaseOrder = async (req, res) => {
    // ✅ *** Confirmed: No expected_delivery_date based on schema ***
    const { supplier_id, product_id, quantity_ordered, order_status } = req.body;

    if (!supplier_id || !product_id || !quantity_ordered || quantity_ordered <= 0) {
        return res.status(400).json({ error: "Valid Supplier ID, Product ID, and a positive Quantity Ordered are required." });
    }

    try {
        // ✅ *** Confirmed: Only inserting columns that exist in schema ***
        const result = await pool.query(
            `INSERT INTO purchase_orders (supplier_id, product_id, quantity_ordered, order_status)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [supplier_id, product_id, quantity_ordered, order_status || 'pending']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("🚨 Error adding purchase order:", error);
        if (error.code === '23503') { return res.status(400).json({ error: "Invalid Supplier ID or Product ID provided." }); }
        res.status(500).json({ error: "Failed to add purchase order" });
    }
};

export const updatePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    // Fields allowed for update via this PUT request
    const { quantity_ordered, order_status } = req.body;

    // --- Input Validation ---
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid order ID parameter is required.' });
    }
    // Check if at least one valid field is provided for update
    if (quantity_ordered === undefined && order_status === undefined) {
        return res.status(400).json({ error: "No valid fields provided for update (quantity_ordered or order_status)." });
    }
    // Validate quantity if provided
    let parsedQuantity = quantity_ordered ? parseInt(quantity_ordered, 10) : null;
    if (quantity_ordered !== undefined && (isNaN(parsedQuantity) || parsedQuantity <= 0)) {
        return res.status(400).json({ error: "Quantity must be a positive number." });
    }
    // Optional: Validate order_status against allowed values
    const allowedStatuses = ['pending', 'shipped', 'received', 'canceled'];
    if (order_status !== undefined && !allowedStatuses.includes(order_status)) {
        return res.status(400).json({ error: `Invalid order status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const client = await pool.connect(); // Get client for transaction

    try {
        await client.query('BEGIN'); // Start transaction

        // --- Fetch Current Order Details (needed for stock update) ---
        const currentOrderResult = await client.query(
            'SELECT product_id, quantity_ordered, order_status FROM purchase_orders WHERE order_id = $1 FOR UPDATE', // Lock the row
            [id]
        );
        if (currentOrderResult.rows.length === 0) {
            throw new Error('Purchase order not found.'); // Will cause rollback and 404
        }
        const currentOrder = currentOrderResult.rows[0];

        // --- Prevent invalid status transitions (optional but good practice) ---
        // Example: Cannot mark a 'canceled' or 'received' order as 'received' again
        if (order_status === 'received' && (currentOrder.order_status === 'received' || currentOrder.order_status === 'canceled')) {
            throw new Error(`Order is already ${currentOrder.order_status} and cannot be marked as received again.`);
        }

        // --- Build the UPDATE query dynamically ---
        const fieldsToUpdate = [];
        const values = [];
        let paramIndex = 1;

        if (quantity_ordered !== undefined) {
            fieldsToUpdate.push(`quantity_ordered = $${paramIndex++}`);
            values.push(parsedQuantity);
        }
        if (order_status !== undefined) {
            fieldsToUpdate.push(`order_status = $${paramIndex++}`);
            values.push(order_status);
        }

        values.push(id); // Add order_id for WHERE clause

        const updateQuery = `UPDATE purchase_orders SET ${fieldsToUpdate.join(', ')} WHERE order_id = $${paramIndex} RETURNING *`;

        // --- Execute PO Update ---
        const updateResult = await client.query(updateQuery, values);

        if (updateResult.rows.length === 0) {
             // Should not happen if FOR UPDATE lock worked, but good failsafe
             throw new Error('Purchase order not found during update attempt.');
        }
        const updatedOrder = updateResult.rows[0];

        // --- 🚀 Update Stock if status changed to 'received' ---
        // Check if the status *became* 'received' in this update request
        if (order_status === 'received' && currentOrder.order_status !== 'received') {
            // Use the quantity from the order *before* potential quantity update in the same request,
            // or use the *updated* quantity if it was part of the request?
            // Let's use the quantity associated with the order state just before marking received.
            const quantityToAdd = currentOrder.quantity_ordered;
            const productId = currentOrder.product_id;

            console.log(`ℹ️ Updating stock for product ${productId} by +${quantityToAdd} due to PO ${id} received.`);

            await client.query(
                'UPDATE products SET current_stock = current_stock + $1 WHERE product_id = $2',
                [quantityToAdd, productId]
            );
        }

        await client.query('COMMIT'); // Commit transaction

        res.status(200).json(updatedOrder); // Return the updated order data

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error(`🚨 Error updating purchase order ${id} (Transaction Rolled Back):`, error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: "Purchase order not found." });
        }
        if (error.message.includes('Order is already')) {
            return res.status(400).json({ error: error.message }); // Invalid state transition
        }
        // Handle other potential errors (FK constraints if product deleted etc.)
        res.status(500).json({ error: "Failed to update purchase order due to an internal error." });
    } finally {
        client.release(); // Release client back to pool
    }
};

// Keep deletePurchaseOrder (it only uses order_id, which exists)
export const deletePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM purchase_orders WHERE order_id = $1 RETURNING order_id", [id]);
        if (result.rowCount === 0) { return res.status(404).json({ error: "Purchase order not found" }); }
        res.status(200).json({ message: `Purchase order with ID ${id} deleted successfully` });
    } catch (error) {
        console.error("🚨 Error deleting purchase order:", error);
        res.status(500).json({ error: "Failed to delete purchase order" });
    }
};