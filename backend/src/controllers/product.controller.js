import pool from '../config/db.js';

export const getAllProducts = async (req, res) => {
    try {
        // Join with categories to get category name
        const result = await pool.query(`
            SELECT
                p.product_id, p.category_id, pc.category_name, p.product_name,
                p.description, p.unit_price, p.current_stock, p.created_at
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            ORDER BY p.product_name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products from the database." });
    }
};

export const addProduct = async (req, res) => {
    const { category_id, product_name, description, unit_price, current_stock } = req.body;
    // Basic validation
    if (!category_id || !product_name || unit_price === undefined || current_stock === undefined) {
        return res.status(400).json({ error: "Missing required fields: category_id, product_name, unit_price, current_stock" });
    }
    try {
        const result = await pool.query(
            `INSERT INTO products (category_id, product_name, description, unit_price, current_stock)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, // Consider returning joined data if needed immediately
            [category_id, product_name, description, unit_price, current_stock]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("🚨 Error adding product:", error);
         if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: "Invalid category_id provided." });
        }
        res.status(500).json({ error: "Failed to add product" });
    }
};

export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // Check dependencies before deleting (e.g., sales_items, purchase_orders) - crucial in real apps
        const result = await pool.query("DELETE FROM products WHERE product_id = $1 RETURNING product_id", [id]);
        if (result.rowCount === 0) {
             return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: `Product with ID ${id} deleted successfully` });
    } catch (error) {
        console.error("🚨 Error deleting product:", error);
         // Handle foreign key constraints if deletion is blocked
        if (error.code === '23503') {
            return res.status(409).json({ error: "Cannot delete product because it is referenced in other records (e.g., sales, orders)." });
        }
        res.status(500).json({ error: "Failed to delete product" });
    }
};

// Add updateProduct controller function if needed