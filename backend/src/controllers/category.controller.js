// src/controllers/category.controller.js
import pool from '../config/db.js';

/**
 * @description Get all product categories
 * @route GET /api/product-categories
 */
export const getAllCategories = async (req, res) => {
    try {
        // Select only the ID and name, order alphabetically for dropdowns
        const [results] = await pool.query( // mysql2 returns [rows, fields]
            "SELECT category_id, category_name FROM product_categories ORDER BY category_name"
        );
        res.status(200).json(results); // Send the array of categories
    } catch (error) {
        console.error("🚨 Error fetching product categories:", error);
        res.status(500).json({ error: "Failed to fetch product categories." });
    }
};

// Add other category-related controllers here if needed (e.g., addCategory, deleteCategory)