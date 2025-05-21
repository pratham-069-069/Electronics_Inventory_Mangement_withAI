import pool from '../config/db.js';

export const getAllProducts = async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT
                p.product_id, p.category_id, pc.category_name, p.product_name,
                p.description, p.unit_price, p.current_stock, p.created_at,
                ia.threshold_quantity
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            LEFT JOIN inventory_alerts ia ON p.product_id = ia.product_id AND ia.alert_type = 'low_stock'
            ORDER BY p.product_name
        `);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products from the database." });
    }
};

export const addProduct = async (req, res) => {
    const { category_id, product_name, description, unit_price, current_stock } = req.body;
    if (!category_id || !product_name || unit_price === undefined || current_stock === undefined) {
        return res.status(400).json({ error: "Missing required fields: category_id, product_name, unit_price, current_stock" });
    }
    try {
        const [result] = await pool.query(
            `INSERT INTO products (category_id, product_name, description, unit_price, current_stock)
             VALUES (?, ?, ?, ?, ?)`,
            [category_id, product_name, description, unit_price, current_stock]
        );
        // Fetch the newly inserted product
        const [newProduct] = await pool.query("SELECT * FROM products WHERE product_id = ?", [result.insertId]);
        res.status(201).json(newProduct[0]);
    } catch (error) {
        console.error("🚨 Error adding product:", error);
        // MySQL error code for foreign key violation is often 1452
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
            return res.status(400).json({ error: "Invalid category_id provided." });
        }
        res.status(500).json({ error: "Failed to add product" });
    }
};

export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query("DELETE FROM products WHERE product_id = ?", [id]);
        if (result.affectedRows === 0) {
             return res.status(404).json({ message: "Product not found" });
        }
        res.json({ message: `Product with ID ${id} deleted successfully` });
    } catch (error) {
        console.error("🚨 Error deleting product:", error);
        // MySQL foreign key constraint error code is typically 1451 (ER_ROW_IS_REFERENCED_2)
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(409).json({ error: "Cannot delete product because it is referenced in other records (e.g., sales, orders)." });
        }
        res.status(500).json({ error: "Failed to delete product" });
    }
};