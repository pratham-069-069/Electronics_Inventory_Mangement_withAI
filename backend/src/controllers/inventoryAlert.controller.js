import pool from '../config/db.js';

// Keep the existing function
export const getInventoryAlerts = async (req, res) => {
    try {
        // Join with products to get product name
        const result = await pool.query(`
            SELECT
                ia.alert_id, ia.product_id, p.product_name,
                ia.alert_type, ia.threshold_quantity, p.current_stock, -- Include current stock for context
                ia.alert_date
            FROM inventory_alerts ia
            JOIN products p ON ia.product_id = p.product_id -- Use JOIN since alert requires product
            WHERE ia.alert_type = 'low_stock' -- Or filter by request query param if needed
            ORDER BY ia.alert_date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching inventory alerts:", error);
        res.status(500).json({ error: "Error fetching inventory alerts from database." });
    }
};

// --- 👇 Add this new function ---
/**
 * @description Delete an inventory alert by its ID.
 * @route DELETE /api/inventory-alerts/:id
 */
export const deleteAlert = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) { // Basic validation for ID
        return res.status(400).json({ error: 'Valid alert ID is required.' });
    }

    try {
        const result = await pool.query(
            "DELETE FROM inventory_alerts WHERE alert_id = $1 RETURNING alert_id", // RETURNING helps confirm deletion
            [id]
        );

        if (result.rowCount === 0) {
            // If no rows were deleted, the alert wasn't found
            return res.status(404).json({ error: `Alert with ID ${id} not found.` });
        }

        // Send a success response
        res.status(200).json({ message: `Alert with ID ${id} successfully deleted.` });
        // Alternatively, send 204 No Content for successful deletions: res.status(204).send();

    } catch (error) {
        console.error(`🚨 Error deleting inventory alert ${id}:`, error);
        res.status(500).json({ error: "Failed to delete inventory alert due to an internal error." });
    }
};
// --- End of new function ---

// Add controllers for creating/updating alert configurations if needed
// e.g., setThreshold(req, res), deleteAlertConfig(req, res)