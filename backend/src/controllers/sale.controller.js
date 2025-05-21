// src/controllers/sale.controller.js
import pool from '../config/db.js';

const TAX_RATE = 0.05;

export const getAllSales = async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT
                s.sales_id,
                s.customer_id,
                COALESCE(c.full_name, 'N/A') as customer_name,
                s.sold_by_user_id,
                COALESCE(u.full_name, 'Unknown User') as sold_by_user_name,
                s.sale_date,
                s.subtotal,
                s.tax_amount,
                s.total_amount,
                s.payment_method,
                s.payment_status
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            LEFT JOIN users u ON s.sold_by_user_id = u.user_id
            ORDER BY s.sale_date DESC
        `);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching sales:", error);
        res.status(500).json({ error: "Error fetching sales from the database." });
    }
};

export const addSale = async (req, res) => {
    const {
        product_id, quantity_sold, unit_price, customer_id, sold_by_user_id,
        payment_method, payment_status,
    } = req.body;

    if (!product_id || !quantity_sold || !unit_price || !sold_by_user_id || !payment_method || !payment_status) {
         return res.status(400).json({ error: "Missing required fields." });
    }
    const quantity = parseInt(quantity_sold, 10);
    const pricePerUnit = parseFloat(unit_price);
    if (isNaN(quantity) || quantity <= 0 || isNaN(pricePerUnit) || pricePerUnit < 0) {
        return res.status(400).json({ error: "Invalid quantity or unit price." });
    }

    const subtotal = quantity * pricePerUnit;
    const tax_amount = subtotal * TAX_RATE;
    const total_amount = subtotal + tax_amount;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [stockCheck] = await connection.query(
            'SELECT product_name, current_stock FROM products WHERE product_id = ? FOR UPDATE',
            [product_id]
        );

        if (stockCheck.length === 0) {
            throw new Error(`Product with ID ${product_id} not found.`);
        }
        const { product_name, current_stock } = stockCheck[0];
        if (current_stock < quantity) {
            throw new Error(`Insufficient stock for ${product_name}. Available: ${current_stock}`);
        }

        const [saleResultMeta] = await connection.query(`
            INSERT INTO sales ( customer_id, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status )
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `, [
            customer_id ? parseInt(customer_id, 10) : null,
            parseInt(sold_by_user_id, 10),
            subtotal.toFixed(2), tax_amount.toFixed(2), total_amount.toFixed(2),
            payment_method, payment_status
        ]);

        const salesId = saleResultMeta.insertId;
        // Fetch the created sale to return
        const [createdSaleRows] = await connection.query("SELECT * FROM sales WHERE sales_id = ?", [salesId]);
        const createdSale = createdSaleRows[0];

        const itemTotal = quantity * pricePerUnit;
        await connection.query(`
            INSERT INTO sales_items (sales_id, product_id, quantity_sold, unit_price, item_total)
            VALUES (?, ?, ?, ?, ?);
        `, [salesId, product_id, quantity, pricePerUnit, itemTotal.toFixed(2)]);

        const newStock = current_stock - quantity;
        await connection.query(`
            UPDATE products SET current_stock = ? WHERE product_id = ?;
        `, [newStock, product_id]);

        const [thresholdCheck] = await connection.query(`
            SELECT threshold_quantity FROM inventory_alerts WHERE product_id = ? AND alert_type = 'low_stock';
        `, [product_id]);

        if (thresholdCheck.length > 0 && newStock <= thresholdCheck[0].threshold_quantity) {
            // Use MySQL's ON DUPLICATE KEY UPDATE
            await connection.query(`
                INSERT INTO inventory_alerts (product_id, alert_type, threshold_quantity, alert_date)
                VALUES (?, 'low_stock', ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE alert_date = CURRENT_TIMESTAMP, threshold_quantity = VALUES(threshold_quantity);
            `, [product_id, thresholdCheck[0].threshold_quantity]);
             console.log(`ℹ️ Low stock alert triggered/updated for product ID ${product_id}`);
        } else if (thresholdCheck.length > 0 && newStock > thresholdCheck[0].threshold_quantity) {
             // For MySQL, if an alert existed, it should be updated (or kept inactive if your logic changes)
             // If the intention is to remove non-triggered alerts, a DELETE is fine.
             await connection.query(`DELETE FROM inventory_alerts WHERE product_id = ? AND alert_type = 'low_stock'`, [product_id]);
             console.log(`ℹ️ Low stock alert may have been cleared for product ID ${product_id}`);
        }

        await connection.commit();
        res.status(201).json(createdSale);

    } catch (error) {
        await connection.rollback();
        console.error("🚨 Error processing sale:", error);
        if (error.message.includes("Insufficient stock") || error.message.includes("not found")) {
             res.status(400).json({ error: error.message });
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) { // FK violation
            res.status(400).json({ error: "Invalid reference ID provided (e.g., customer, user, product)." });
        } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || error.code === 'ER_BAD_NULL_ERROR') { // MySQL specific data type issues
             res.status(400).json({ error: "Invalid data format provided for numeric fields (ID, quantity, price)." });
        } else {
            res.status(500).json({ error: "Failed to process sale due to an internal server error." });
        }
    } finally {
        connection.release();
    }
};