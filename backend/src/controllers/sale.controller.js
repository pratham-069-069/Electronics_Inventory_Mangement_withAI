// src/controllers/sale.controller.js
import pool from '../config/db.js';

// ... (keep your existing getAllSales and addSale functions) ...

export const getAllSales = async (req, res) => {
    // Your existing implementation for getAllSales
    try {
        // Example query:
        const query = `
            SELECT 
                s.sales_id, s.sale_date, s.subtotal, s.tax_amount, s.total_amount,
                s.payment_method, s.payment_status,
                c.full_name as customer_name, c.customer_id,
                u.full_name as sold_by_user_name, u.user_id as sold_by_user_id
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.customer_id
            LEFT JOIN USERS u ON s.sold_by_user_id = u.user_id
            ORDER BY s.sale_date DESC;
        `;
        const [results] = await pool.query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching sales:", error);
        res.status(500).json({ error: "Failed to fetch sales records." });
    }
};

export const addSale = async (req, res) => {
    // Your existing implementation for addSale
    const {
        product_id,
        quantity_sold,
        unit_price, // Frontend sends this, backend should verify against product table
        customer_id,
        sold_by_user_id,
        payment_method,
        payment_status
    } = req.body;

    // Basic validation
    if (!product_id || !quantity_sold || !unit_price || !sold_by_user_id || !payment_method || !payment_status) {
        return res.status(400).json({ error: "Missing required fields for the sale." });
    }
    if (isNaN(parseInt(quantity_sold)) || parseInt(quantity_sold) <= 0) {
        return res.status(400).json({ error: "Quantity sold must be a positive integer." });
    }
    if (isNaN(parseFloat(unit_price)) || parseFloat(unit_price) < 0) {
        return res.status(400).json({ error: "Unit price must be a non-negative number." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch product details (to verify price and check stock)
        const [products] = await connection.query("SELECT unit_price, current_stock, product_name FROM products WHERE product_id = ?", [product_id]);
        if (products.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Product not found." });
        }
        const product = products[0];

        // Verify unit price (optional, but good practice)
        if (parseFloat(unit_price) !== parseFloat(product.unit_price)) {
            // Log a warning or handle as an error depending on business rules
            console.warn(`Price mismatch for product ${product_id}. Frontend: ${unit_price}, Backend: ${product.unit_price}`);
            // For now, we'll proceed with the frontend price but this is a point of attention
        }

        // Check stock
        if (product.current_stock < parseInt(quantity_sold)) {
            await connection.rollback();
            return res.status(400).json({ error: `Insufficient stock for ${product.product_name}. Available: ${product.current_stock}` });
        }

        // 2. Calculate amounts
        const subtotal = parseFloat(unit_price) * parseInt(quantity_sold);
        const TAX_RATE = 0.05; // Should be a configurable value
        const tax_amount = subtotal * TAX_RATE;
        const total_amount = subtotal + tax_amount;

        // 3. Insert into SALES table
        const [saleResult] = await connection.query(
            `INSERT INTO SALES (customer_id, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status, sale_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [customer_id || null, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status]
        );
        const newSaleId = saleResult.insertId;

        // 4. Insert into SALES_ITEMS table
        const item_total = parseFloat(unit_price) * parseInt(quantity_sold); // Same as subtotal for a single-item sale logic
        await connection.query(
            `INSERT INTO SALES_ITEMS (sales_id, product_id, quantity_sold, unit_price, item_total)
             VALUES (?, ?, ?, ?, ?)`,
            [newSaleId, product_id, parseInt(quantity_sold), parseFloat(unit_price), item_total]
        );

        // 5. Update product stock
        await connection.query(
            "UPDATE products SET current_stock = current_stock - ? WHERE product_id = ?",
            [parseInt(quantity_sold), product_id]
        );

        await connection.commit();

        // Fetch the newly created sale with joined data to return
        const [newSaleData] = await connection.query(
             `SELECT 
                s.sales_id, s.sale_date, s.subtotal, s.tax_amount, s.total_amount,
                s.payment_method, s.payment_status,
                c.full_name as customer_name, c.customer_id,
                u.full_name as sold_by_user_name, u.user_id as sold_by_user_id
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.customer_id
            LEFT JOIN USERS u ON s.sold_by_user_id = u.user_id
            WHERE s.sales_id = ?`,
            [newSaleId]
        );
        res.status(201).json(newSaleData[0]);

    } catch (error) {
        await connection.rollback();
        console.error("🚨 Error adding sale:", error);
        res.status(500).json({ error: "Failed to add sale due to an internal server error." });
    } finally {
        connection.release();
    }
};


// New controller function for GET /api/sales/items-for-return
export const getEligibleSalesItemsForReturn = async (req, res) => {
    try {
        const query = `
            SELECT
                si.sales_item_id,
                si.sales_id,
                s.sale_date,
                si.product_id,
                p.product_name,
                si.quantity_sold AS original_quantity_sold,
                si.unit_price,
                (si.quantity_sold - COALESCE(SUM(r.quantity_returned), 0)) AS quantity_remaining_for_return
            FROM
                sales_items si
            JOIN
                products p ON si.product_id = p.product_id
            JOIN
                sales s ON si.sales_id = s.sales_id
            LEFT JOIN
                returns_ r ON si.sales_item_id = r.sales_item_id
            GROUP BY
                si.sales_item_id, s.sale_date, p.product_name, si.quantity_sold, si.unit_price, s.sales_id 
                -- Added s.sales_id to GROUP BY as it's selected
            HAVING
                quantity_remaining_for_return > 0 -- Ensure it's consistent with SELECT alias
            ORDER BY
                s.sale_date DESC, si.sales_item_id DESC;
        `;
        const [results] = await pool.query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching eligible sales items for return:", error);
        res.status(500).json({ error: "Failed to fetch eligible sales items." });
    }
};

export const updateSale = async (req, res) => {
    const { salesId } = req.params;
    // Only allow updating specific fields to prevent accidental data corruption
    // or complex recalculations not handled here.
    const { customer_id, payment_method, payment_status } = req.body;

    if (!salesId || isNaN(parseInt(salesId))) {
        return res.status(400).json({ error: 'Valid Sale ID is required.' });
    }

    // Validate updatable fields
    if (!payment_method || !payment_status) {
        return res.status(400).json({ error: 'Payment method and status are required.' });
    }
    // Add more specific validation for payment_method and payment_status values if needed

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if sale exists
        const [existingSale] = await connection.query("SELECT * FROM SALES WHERE sales_id = ?", [salesId]);
        if (existingSale.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Sale not found." });
        }

        // Construct the update query carefully
        // For this simplified edit, we are NOT recalculating subtotal, tax, total_amount.
        // If you were to allow changing items/quantities, those would need recalculation.
        const [updateResult] = await connection.query(
            `UPDATE SALES 
             SET customer_id = ?, payment_method = ?, payment_status = ?
             WHERE sales_id = ?`,
            [customer_id ? parseInt(customer_id) : null, payment_method, payment_status, salesId]
        );

        if (updateResult.affectedRows === 0) {
            // Should ideally not happen if sale was found, but good to check
            await connection.rollback();
            return res.status(404).json({ error: "Sale not found or no changes made." });
        }

        await connection.commit();

        // Fetch the updated sale data to return
        const [updatedSaleData] = await connection.query(
             `SELECT 
                s.sales_id, s.sale_date, s.subtotal, s.tax_amount, s.total_amount,
                s.payment_method, s.payment_status,
                c.full_name as customer_name, c.customer_id,
                u.full_name as sold_by_user_name, u.user_id as sold_by_user_id
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.customer_id
            LEFT JOIN USERS u ON s.sold_by_user_id = u.user_id
            WHERE s.sales_id = ?`,
            [salesId]
        );

        res.status(200).json(updatedSaleData[0]);

    } catch (error) {
        await connection.rollback();
        console.error(`🚨 Error updating sale ${salesId}:`, error);
        res.status(500).json({ error: "Failed to update sale due to an internal server error." });
    } finally {
        connection.release();
    }
};