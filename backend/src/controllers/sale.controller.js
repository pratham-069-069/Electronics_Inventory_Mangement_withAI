// src/controllers/sale.controller.js
import pool from '../config/db.js';

// Define a tax rate (e.g., 0.05 for 5%, 0.0 for no tax)
const TAX_RATE = 0.05; // Example: 5% tax rate

/**
 * @description Get all sales records with customer and user names joined
 * @route GET /api/sales
 */
export const getAllSales = async (req, res) => {
    try {
        // ✅ *** UPDATED QUERY using c.full_name from CUSTOMERS schema ***
        const result = await pool.query(`
            SELECT
                s.sales_id,
                s.customer_id,
                -- 👇 Using correct column 'full_name' from customers table
                COALESCE(c.full_name, 'N/A') as customer_name,
                s.sold_by_user_id,
                COALESCE(u.full_name, 'Unknown User') as sold_by_user_name, -- users.full_name is correct
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
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching sales:", error);
        res.status(500).json({ error: "Error fetching sales from the database." });
    }
};

// Keep the existing addSale function (it should be okay as it doesn't select customer_name)
export const addSale = async (req, res) => {
    const {
        product_id, quantity_sold, unit_price, customer_id, sold_by_user_id,
        payment_method, payment_status,
    } = req.body;

    if (!product_id || !quantity_sold || !unit_price || !sold_by_user_id || !payment_method || !payment_status) {
         return res.status(400).json({ error: "Missing required fields: product_id, quantity_sold, unit_price, sold_by_user_id, payment_method, payment_status." });
    }
    const quantity = parseInt(quantity_sold, 10);
    const pricePerUnit = parseFloat(unit_price);
    if (isNaN(quantity) || quantity <= 0 || isNaN(pricePerUnit) || pricePerUnit < 0) {
        return res.status(400).json({ error: "Invalid quantity or unit price. Quantity must be positive." });
    }

    const subtotal = quantity * pricePerUnit;
    const tax_amount = subtotal * TAX_RATE;
    const total_amount = subtotal + tax_amount;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const stockCheck = await client.query(
            'SELECT product_name, current_stock FROM products WHERE product_id = $1 FOR UPDATE',
            [product_id]
        );

        if (stockCheck.rows.length === 0) {
            throw new Error(`Product with ID ${product_id} not found.`);
        }
        const { product_name, current_stock } = stockCheck.rows[0];
        if (current_stock < quantity) {
            throw new Error(`Insufficient stock for ${product_name} (ID: ${product_id}). Available: ${current_stock}, Requested: ${quantity}`);
        }

        const saleResult = await client.query(`
            INSERT INTO sales ( customer_id, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING sales_id, customer_id, sold_by_user_id, sale_date, subtotal, tax_amount, total_amount, payment_method, payment_status;
        `, [
            customer_id ? parseInt(customer_id, 10) : null,
            parseInt(sold_by_user_id, 10),
            subtotal.toFixed(2), tax_amount.toFixed(2), total_amount.toFixed(2),
            payment_method, payment_status
        ]);

        const createdSale = saleResult.rows[0];
        const salesId = createdSale.sales_id;
        const itemTotal = quantity * pricePerUnit;

        await client.query(`
            INSERT INTO sales_items (sales_id, product_id, quantity_sold, unit_price, item_total)
            VALUES ($1, $2, $3, $4, $5);
        `, [salesId, product_id, quantity, pricePerUnit, itemTotal.toFixed(2)]);

        const newStock = current_stock - quantity;
        await client.query(`
            UPDATE products SET current_stock = $1 WHERE product_id = $2;
        `, [newStock, product_id]);

        // Inventory alert check logic (remains the same)
        const thresholdCheck = await client.query(`
            SELECT threshold_quantity FROM inventory_alerts WHERE product_id = $1 AND alert_type = 'low_stock';
        `, [product_id]);
        if (thresholdCheck.rows.length > 0 && newStock <= thresholdCheck.rows[0].threshold_quantity) {
            await client.query(`
                INSERT INTO inventory_alerts (product_id, alert_type, threshold_quantity, alert_date)
                VALUES ($1, 'low_stock', $2, CURRENT_TIMESTAMP)
                ON CONFLICT (product_id, alert_type) DO UPDATE SET alert_date = CURRENT_TIMESTAMP, threshold_quantity = EXCLUDED.threshold_quantity;
            `, [product_id, thresholdCheck.rows[0].threshold_quantity]);
             console.log(`ℹ️ Low stock alert triggered/updated for product ID ${product_id}`);
        } else if (thresholdCheck.rows.length > 0 && newStock > thresholdCheck.rows[0].threshold_quantity) {
             await client.query(`DELETE FROM inventory_alerts WHERE product_id = $1 AND alert_type = 'low_stock'`, [product_id]);
             console.log(`ℹ️ Low stock alert cleared for product ID ${product_id}`);
        }

        await client.query('COMMIT');
        res.status(201).json(createdSale);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("🚨 Error processing sale:", error);
        if (error.message.includes("Insufficient stock") || error.message.includes("not found")) {
             res.status(400).json({ error: error.message });
        } else if (error.code === '23503') {
            res.status(400).json({ error: "Invalid reference ID provided (e.g., customer, user, product)." });
        } else if (error.code === '22P02') {
             res.status(400).json({ error: "Invalid data format provided for numeric fields (ID, quantity, price)." });
        } else {
            res.status(500).json({ error: "Failed to process sale due to an internal server error." });
        }
    } finally {
        client.release();
    }
};