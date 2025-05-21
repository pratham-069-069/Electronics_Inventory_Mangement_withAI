// src/controllers/purchaseOrder.controller.js
import pool from '../config/db.js';

export const getAllPurchaseOrders = async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT
                po.order_id, po.supplier_id, s.supplier_name,
                po.product_id, p.product_name, po.quantity_ordered,
                po.order_status, po.order_date
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN products p ON po.product_id = p.product_id
            ORDER BY po.order_date DESC
        `);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching purchase orders:", error);
        res.status(500).json({ error: "Error fetching purchase orders from the database." });
    }
};

export const addPurchaseOrder = async (req, res) => {
    const { supplier_id, product_id, quantity_ordered, order_status } = req.body;

    if (!supplier_id || !product_id || !quantity_ordered || quantity_ordered <= 0) {
        return res.status(400).json({ error: "Valid Supplier ID, Product ID, and a positive Quantity Ordered are required." });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO purchase_orders (supplier_id, product_id, quantity_ordered, order_status)
             VALUES (?, ?, ?, ?)`,
            [supplier_id, product_id, quantity_ordered, order_status || 'pending']
        );
        // To return the created object, we select it by the insertId
        const [newOrder] = await pool.query("SELECT * FROM purchase_orders WHERE order_id = ?", [result.insertId]);
        res.status(201).json(newOrder[0]);
    } catch (error) {
        console.error("🚨 Error adding purchase order:", error);
        // MySQL error code for foreign key violation is often 1452 (ER_NO_REFERENCED_ROW_2)
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
            return res.status(400).json({ error: "Invalid Supplier ID or Product ID provided." });
        }
        res.status(500).json({ error: "Failed to add purchase order" });
    }
};

export const updatePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { quantity_ordered, order_status } = req.body;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid order ID parameter is required.' });
    }
    if (quantity_ordered === undefined && order_status === undefined) {
        return res.status(400).json({ error: "No valid fields provided for update (quantity_ordered or order_status)." });
    }
    let parsedQuantity = quantity_ordered ? parseInt(quantity_ordered, 10) : null;
    if (quantity_ordered !== undefined && (isNaN(parsedQuantity) || parsedQuantity <= 0)) {
        return res.status(400).json({ error: "Quantity must be a positive number." });
    }
    const allowedStatuses = ['pending', 'shipped', 'received', 'canceled'];
    if (order_status !== undefined && !allowedStatuses.includes(order_status)) {
        return res.status(400).json({ error: `Invalid order status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const connection = await pool.getConnection(); // Get connection for transaction

    try {
        await connection.beginTransaction();

        const [currentOrderResult] = await connection.query(
            'SELECT product_id, quantity_ordered, order_status FROM purchase_orders WHERE order_id = ? FOR UPDATE',
            [id]
        );
        if (currentOrderResult.length === 0) {
            throw new Error('Purchase order not found.');
        }
        const currentOrder = currentOrderResult[0];

        if (order_status === 'received' && (currentOrder.order_status === 'received' || currentOrder.order_status === 'canceled')) {
            throw new Error(`Order is already ${currentOrder.order_status} and cannot be marked as received again.`);
        }

        const fieldsToUpdate = [];
        const values = [];

        if (quantity_ordered !== undefined) {
            fieldsToUpdate.push(`quantity_ordered = ?`);
            values.push(parsedQuantity);
        }
        if (order_status !== undefined) {
            fieldsToUpdate.push(`order_status = ?`);
            values.push(order_status);
        }
        values.push(id);

        const updateQuery = `UPDATE purchase_orders SET ${fieldsToUpdate.join(', ')} WHERE order_id = ?`;
        const [updateResultMeta] = await connection.query(updateQuery, values);

        if (updateResultMeta.affectedRows === 0) {
             throw new Error('Purchase order not found during update attempt or no changes made.');
        }

        if (order_status === 'received' && currentOrder.order_status !== 'received') {
            const quantityToAdd = currentOrder.quantity_ordered;
            const productId = currentOrder.product_id;
            console.log(`ℹ️ Updating stock for product ${productId} by +${quantityToAdd} due to PO ${id} received.`);
            await connection.query(
                'UPDATE products SET current_stock = current_stock + ? WHERE product_id = ?',
                [quantityToAdd, productId]
            );
        }

        await connection.commit();

        // Fetch the updated order to return
        const [updatedOrderRows] = await connection.query("SELECT * FROM purchase_orders WHERE order_id = ?", [id]);
        res.status(200).json(updatedOrderRows[0]);

    } catch (error) {
        await connection.rollback();
        console.error(`🚨 Error updating purchase order ${id} (Transaction Rolled Back):`, error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: "Purchase order not found." });
        }
        if (error.message.includes('Order is already')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to update purchase order due to an internal error." });
    } finally {
        connection.release();
    }
};

export const deletePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query("DELETE FROM purchase_orders WHERE order_id = ?", [id]);
        if (result.affectedRows === 0) { return res.status(404).json({ error: "Purchase order not found" }); }
        res.status(200).json({ message: `Purchase order with ID ${id} deleted successfully` });
    } catch (error) {
        console.error("🚨 Error deleting purchase order:", error);
        res.status(500).json({ error: "Failed to delete purchase order" });
    }
};