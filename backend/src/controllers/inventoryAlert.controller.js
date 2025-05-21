import pool from '../config/db.js';

export const getInventoryAlerts = async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT
                ia.alert_id, ia.product_id, p.product_name,
                ia.alert_type, ia.threshold_quantity, p.current_stock,
                ia.alert_date
            FROM inventory_alerts ia
            JOIN products p ON ia.product_id = p.product_id
            WHERE ia.alert_type = 'low_stock'
            ORDER BY ia.alert_date DESC
        `);
        res.json(results);
    } catch (error) {
        console.error("🚨 Error fetching inventory alerts:", error);
        res.status(500).json({ error: "Error fetching inventory alerts from database." });
    }
};

export const deleteAlert = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid alert ID is required.' });
    }

    try {
        // For DELETE, affectedRows indicates if a row was deleted
        const [result] = await pool.query(
            "DELETE FROM inventory_alerts WHERE alert_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Alert with ID ${id} not found.` });
        }
        res.status(200).json({ message: `Alert with ID ${id} successfully deleted.` });
    } catch (error) {
        console.error(`🚨 Error deleting inventory alert ${id}:`, error);
        res.status(500).json({ error: "Failed to delete inventory alert due to an internal error." });
    }
};

export const updateThreshold = async (req, res) => {
    const { productId } = req.params;
    const { threshold_quantity } = req.body;

    if (!productId || isNaN(parseInt(productId))) {
        return res.status(400).json({ error: 'Valid Product ID parameter is required.' });
    }
    const thresholdNum = parseInt(threshold_quantity, 10);
    if (threshold_quantity === undefined || threshold_quantity === null || isNaN(thresholdNum) || thresholdNum < 0) {
        return res.status(400).json({ error: 'Valid, non-negative threshold_quantity is required in the request body.' });
    }

    try {
        // MySQL's INSERT ... ON DUPLICATE KEY UPDATE
        // Assumes you have a UNIQUE key on (product_id, alert_type) for this to work.
        // If not, you'd need to do a SELECT then INSERT or UPDATE.
        const query = `
            INSERT INTO inventory_alerts (product_id, alert_type, threshold_quantity, alert_date, is_active)
            VALUES (?, 'low_stock', ?, CURRENT_TIMESTAMP, true)
            ON DUPLICATE KEY UPDATE
               threshold_quantity = VALUES(threshold_quantity),
               alert_date = CURRENT_TIMESTAMP,
               is_active = VALUES(is_active);
        `;
        // We can't easily get the RETURNING data like in pg.
        // We'll do a separate select if needed or just confirm success.
        const [result] = await pool.query(query, [productId, thresholdNum]);

        if (result.affectedRows > 0 || result.insertId > 0) {
            console.log(`✅ Threshold updated for product ${productId} to ${thresholdNum}`);
            // Fetch the updated/inserted row to return it (optional, but good for consistency)
            const [updatedAlertRows] = await pool.query(
                "SELECT product_id, threshold_quantity, alert_date FROM inventory_alerts WHERE product_id = ? AND alert_type = 'low_stock'",
                [productId]
            );

            res.status(200).json({
                message: `Threshold for product ${productId} set/updated to ${thresholdNum}.`,
                updatedAlert: updatedAlertRows.length > 0 ? updatedAlertRows[0] : null
            });
        } else {
            throw new Error("Failed to insert or update threshold.");
        }

    } catch (error) {
        console.error(`🚨 Error updating threshold for product ${productId}:`, error);
        // MySQL error code for foreign key violation is often 1452
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
            return res.status(404).json({ error: `Product with ID ${productId} not found.` });
        }
        res.status(500).json({ error: "Failed to update threshold due to an internal error." });
    }
};