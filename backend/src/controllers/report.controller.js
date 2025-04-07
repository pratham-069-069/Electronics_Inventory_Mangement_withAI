import pool from '../config/db.js';

export const getAllReports = async (req, res) => {
    try {
        // Join with users table to get generator's name
        const result = await pool.query(`
            SELECT r.report_id, r.report_name, r.generated_by_user_id, u.full_name as generated_by_user_name,
                   r.report_data, r.created_at
            FROM reports r
            LEFT JOIN users u ON r.generated_by_user_id = u.user_id
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching reports:", error);
        res.status(500).json({ error: "Error fetching reports from the database." });
    }
};

export const addReport = async (req, res) => {
    const { report_name, generated_by_user_id, report_data } = req.body;

    if (!report_name || !report_data) {
        return res.status(400).json({ error: "Report name and report data (JSON) are required." });
    }
     // Optional: Validate if report_data is valid JSON
    try {
        JSON.parse(JSON.stringify(report_data)); // Quick check if it's JSON-compatible
    } catch (parseError) {
         return res.status(400).json({ error: "Report data must be valid JSON." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO reports (report_name, generated_by_user_id, report_data)
             VALUES ($1, $2, $3)
             RETURNING report_id, report_name, generated_by_user_id, created_at`, // Don't return large data blob
            [report_name, generated_by_user_id, report_data] // Storing JSON directly
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("🚨 Error adding report:", error);
         if (error.code === '23503') { // FK violation for user_id
             return res.status(400).json({ error: "Invalid user ID provided for 'generated_by_user_id'." });
        }
        res.status(500).json({ error: "Failed to add report" });
    }
};

// Get specific report (including data)
export const getReportById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT r.report_id, r.report_name, r.generated_by_user_id, u.full_name as generated_by_user_name,
                   r.report_data, r.created_at
            FROM reports r
            LEFT JOIN users u ON r.generated_by_user_id = u.user_id
            WHERE r.report_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }
        res.json(result.rows[0]); // Return the full report details including data
    } catch (error) {
        console.error(`🚨 Error fetching report ${id}:`, error);
        res.status(500).json({ error: "Failed to fetch report details" });
    }
};


export const updateReport = async (req, res) => {
    const { id } = req.params;
    const { report_name, report_data } = req.body; // Allow updating name and data

    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    if (report_name) {
        fieldsToUpdate.push(`report_name = $${paramIndex++}`);
        values.push(report_name);
    }
    if (report_data) {
         try { // Validate JSON before adding to query
            JSON.parse(JSON.stringify(report_data));
            fieldsToUpdate.push(`report_data = $${paramIndex++}`);
            values.push(report_data);
        } catch (parseError) {
            return res.status(400).json({ error: "Report data must be valid JSON." });
        }
    }

     if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: "No fields provided for update." });
    }

    values.push(id); // Add report_id for WHERE clause
    const query = `UPDATE reports SET ${fieldsToUpdate.join(', ')} WHERE report_id = $${paramIndex} RETURNING report_id, report_name, generated_by_user_id, created_at`;


    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }
        res.json(result.rows[0]); // Return updated metadata
    } catch (error) {
        console.error("🚨 Error updating report:", error);
        res.status(500).json({ error: "Failed to update report" });
    }
};

export const deleteReport = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM reports WHERE report_id = $1 RETURNING report_id", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Report not found" });
        }
        res.json({ message: `Report with ID ${id} deleted successfully` });
    } catch (error) {
        console.error("🚨 Error deleting report:", error);
        res.status(500).json({ error: "Failed to delete report" });
    }
};