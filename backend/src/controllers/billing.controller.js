// src/controllers/billing.controller.js
import pool from '../config/db.js';

/**
 * @description Get detailed information for a single invoice (sale)
 * @route GET /api/billing/invoice/:salesId
 */
export const getInvoiceDetails = async (req, res) => {
    const { salesId } = req.params;

    if (!salesId || isNaN(parseInt(salesId))) {
        return res.status(400).json({ error: 'Valid salesId parameter is required.' });
    }

    try {
        // Fetch main sale details, customer info, user info
        const saleQuery = `
            SELECT
                s.sales_id, s.sale_date, s.subtotal, s.tax_amount, s.total_amount,
                s.payment_method, s.payment_status,
                c.customer_id, COALESCE(c.full_name, 'N/A') as customer_name, c.email as customer_email, c.phone_number as customer_phone,
                u.user_id as sold_by_user_id, COALESCE(u.full_name, 'Unknown') as sold_by_user_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            LEFT JOIN users u ON s.sold_by_user_id = u.user_id
            WHERE s.sales_id = $1;
        `;
        const saleResult = await pool.query(saleQuery, [salesId]);

        if (saleResult.rows.length === 0) {
            return res.status(404).json({ error: `Invoice with ID ${salesId} not found.` });
        }

        const invoiceHeader = saleResult.rows[0];

        // Fetch line items for the sale
        const itemsQuery = `
            SELECT
                si.sales_item_id, si.product_id, p.product_name, si.quantity_sold,
                si.unit_price, si.item_total
            FROM sales_items si
            JOIN products p ON si.product_id = p.product_id
            WHERE si.sales_id = $1
            ORDER BY p.product_name;
        `;
        const itemsResult = await pool.query(itemsQuery, [salesId]);

        // Combine header and items into one response object
        const invoiceData = {
            ...invoiceHeader,
            items: itemsResult.rows
        };

        res.status(200).json(invoiceData);

    } catch (error) {
        console.error(`🚨 Error fetching invoice details for salesId ${salesId}:`, error);
        res.status(500).json({ error: "Failed to fetch invoice details due to an internal server error." });
    }
};