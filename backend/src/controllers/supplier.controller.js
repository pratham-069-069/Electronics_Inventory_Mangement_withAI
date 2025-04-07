// src/controllers/supplier.controller.js
import pool from '../config/db.js';

/**
 * @description Get all suppliers with their primary contact info joined
 * @route GET /api/suppliers
 */
export const getAllSuppliers = async (req, res) => {
    try {
        // ✅ *** JOIN suppliers with supplier_contact ***
        // Use LEFT JOIN to include suppliers even if they don't have a contact entry yet
        const result = await pool.query(`
            SELECT
                s.supplier_id,
                s.supplier_name,
                s.email,
                s.address,
                s.created_at,
                sc.contact_person,
                sc.phone_number
            FROM suppliers s
            LEFT JOIN supplier_contact sc ON s.supplier_id = sc.supplier_id
            ORDER BY s.supplier_name
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching suppliers:", error);
        res.status(500).json({ error: "Failed to fetch suppliers." });
    }
};


/**
 * @description Add a new supplier and their contact info using a transaction
 * @route POST /api/suppliers
 */
export const addSupplier = async (req, res) => {
    // Destructure all fields needed for both tables
    const { supplier_name, email, address, contact_person, phone_number } = req.body;

    // Validate required fields for the main suppliers table
    if (!supplier_name || !email) {
        return res.status(400).json({ error: "Supplier name and email are required." });
    }

    const client = await pool.connect(); // Get a client for transaction

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Insert into suppliers table and get the new supplier_id
        const supplierInsertResult = await client.query(
            `INSERT INTO suppliers (supplier_name, email, address)
             VALUES ($1, $2, $3)
             RETURNING supplier_id`,
            [supplier_name, email, address]
        );
        const newSupplierId = supplierInsertResult.rows[0].supplier_id;

        // 2. Insert into supplier_contact table IF contact info is provided
        //    (Handle cases where contact_person or phone_number might be empty strings or null)
        if (contact_person || phone_number) {
             await client.query(
                `INSERT INTO supplier_contact (supplier_id, contact_person, phone_number)
                 VALUES ($1, $2, $3)`,
                [newSupplierId, contact_person || null, phone_number || null] // Use null if empty
             );
        } else {
            console.log(`ℹ️ No contact person or phone number provided for new supplier ID: ${newSupplierId}. Skipping insert into supplier_contact.`);
        }

        await client.query('COMMIT'); // Commit transaction

        // 3. Fetch the newly created supplier with joined contact info to return complete data
        //    (This ensures the response matches the GET all structure)
        const newSupplierData = await client.query(
             `SELECT
                s.supplier_id, s.supplier_name, s.email, s.address, s.created_at,
                sc.contact_person, sc.phone_number
             FROM suppliers s
             LEFT JOIN supplier_contact sc ON s.supplier_id = sc.supplier_id
             WHERE s.supplier_id = $1`,
            [newSupplierId]
        );

        res.status(201).json(newSupplierData.rows[0] || { supplier_id: newSupplierId, message: "Supplier added, contact might be empty." }); // Return the full new supplier object

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error("🚨 Error adding supplier (Transaction Rolled Back):", error);
        if (error.code === '23505') { // Handle unique constraints (like duplicate email in suppliers)
            return res.status(409).json({ error: "Supplier with this email already exists." });
        }
         // Add more specific error handling if needed (e.g., foreign key issues if tables change)
        res.status(500).json({ error: "Failed to add supplier due to an internal error." });
    } finally {
        client.release(); // Release client back to the pool
    }
};

/**
 * @description Delete a supplier and their associated contact info using a transaction
 * @route DELETE /api/suppliers/:id
 */
export const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid supplier ID is required.' });
    }

    const client = await pool.connect(); // Get client for transaction

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Delete from the dependent table first (supplier_contact)
        //    This is safer than relying solely on CASCADE, especially if constraints change.
        //    It's okay if no rows are found here (supplier might not have had contact info).
        await client.query("DELETE FROM supplier_contact WHERE supplier_id = $1", [id]);

        // 2. Delete from the main table (suppliers)
        const deleteSupplierResult = await client.query(
            "DELETE FROM suppliers WHERE supplier_id = $1 RETURNING supplier_id",
            [id]
        );

        // Check if the supplier actually existed before deletion
        if (deleteSupplierResult.rowCount === 0) {
            // If supplier wasn't found, rollback (though nothing harmful happened) and send 404
             await client.query('ROLLBACK'); // Optional rollback here, as no changes were committed yet
             return res.status(404).json({ message: "Supplier not found." });
        }

        await client.query('COMMIT'); // Commit transaction

        res.status(200).json({ message: `Supplier with ID ${id} and associated contacts deleted successfully.` });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on any error
        console.error(`🚨 Error deleting supplier ${id} (Transaction Rolled Back):`, error);
        // Check for foreign key violation errors if supplier is linked elsewhere (e.g., purchase_orders)
        if (error.code === '23503') {
            return res.status(409).json({ error: "Cannot delete supplier. It is likely referenced in existing purchase orders." });
        }
        res.status(500).json({ error: "Failed to delete supplier due to an internal error." });
    } finally {
        client.release(); // Release client back to the pool
    }
};