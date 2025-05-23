// src/controllers/supplier.controller.js
import pool from '../config/db.js';

export const getAllSuppliers = async (req, res) => {
    try {
        const [results] = await pool.query(`
            SELECT
                s.supplier_id,
                s.supplier_name,
                s.email,
                s.address,
                s.created_at,
                sc.contact_person, -- Assuming this column is directly in SUPPLIERS or joined correctly
                sc.phone_number    -- Assuming this column is directly in SUPPLIERS or joined correctly
            FROM suppliers s
            LEFT JOIN supplier_contacts sc ON s.supplier_id = sc.supplier_id -- Corrected table name based on schema
            ORDER BY s.supplier_name
        `);
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching suppliers:", error);
        res.status(500).json({ error: "Failed to fetch suppliers." });
    }
};

export const addSupplier = async (req, res) => {
    const { supplier_name, email, address, contact_person, phone_number } = req.body;
    if (!supplier_name || !email) { // Assuming email in suppliers table can be null based on schema
        return res.status(400).json({ error: "Supplier name is required." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [supplierInsertResult] = await connection.query(
            `INSERT INTO suppliers (supplier_name, email, address)
             VALUES (?, ?, ?)`,
            [supplier_name, email, address]
        );
        const newSupplierId = supplierInsertResult.insertId;

        if (contact_person || phone_number) {
             await connection.query(
                `INSERT INTO supplier_contacts (supplier_id, contact_person, phone_number)
                 VALUES (?, ?, ?)`, // Corrected table name
                [newSupplierId, contact_person || null, phone_number || null]
             );
        }

        await connection.commit();

        const [newSupplierData] = await connection.query( // Use connection for select within transaction
             `SELECT
                s.supplier_id, s.supplier_name, s.email, s.address, s.created_at,
                sc.contact_person, sc.phone_number
             FROM suppliers s
             LEFT JOIN supplier_contacts sc ON s.supplier_id = sc.supplier_id
             WHERE s.supplier_id = ?`,
            [newSupplierId]
        );
        res.status(201).json(newSupplierData[0] || { supplier_id: newSupplierId, message: "Supplier added, contact might be empty." });

    } catch (error) {
        await connection.rollback();
        console.error("🚨 Error adding supplier (Transaction Rolled Back):", error);
        // MySQL error code for unique constraint is ER_DUP_ENTRY (1062)
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ error: "Supplier with this name or email already exists (if unique)." });
        }
        res.status(500).json({ error: "Failed to add supplier due to an internal error." });
    } finally {
        connection.release();
    }
};

export const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid supplier ID is required.' });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Delete from supplier_contacts first (dependent table)
        await connection.query("DELETE FROM supplier_contacts WHERE supplier_id = ?", [id]); // Corrected table name
        const [deleteSupplierResult] = await connection.query(
            "DELETE FROM suppliers WHERE supplier_id = ?", [id]
        );
        if (deleteSupplierResult.affectedRows === 0) {
             await connection.rollback();
             return res.status(404).json({ message: "Supplier not found." });
        }
        await connection.commit();
        res.status(200).json({ message: `Supplier with ID ${id} and associated contacts deleted successfully.` });
    } catch (error) {
        await connection.rollback();
        console.error(`🚨 Error deleting supplier ${id} (Transaction Rolled Back):`, error);
        // MySQL foreign key error code is 1451
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(409).json({ error: "Cannot delete supplier. It is likely referenced in existing purchase orders." });
        }
        res.status(500).json({ error: "Failed to delete supplier due to an internal error." });
    } finally {
        connection.release();
    }
};

export const updateSupplier = async (req, res) => {
    const { id } = req.params;
    const { supplier_name, email, address, contact_person, phone_number } = req.body;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid supplier ID is required.' });
    }
    if (!supplier_name) { // Add other necessary validations
        return res.status(400).json({ error: "Supplier name is required." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update the SUPPLIERS table
        const [supplierUpdateResult] = await connection.query(
            `UPDATE suppliers SET supplier_name = ?, email = ?, address = ?
             WHERE supplier_id = ?`,
            [supplier_name, email || null, address || null, id]
        );

        if (supplierUpdateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Supplier not found or no changes made to supplier details." });
        }

        // 2. Update or Insert into SUPPLIER_CONTACTS
        // Check if a contact already exists for this supplier
        const [existingContacts] = await connection.query(
            "SELECT contact_id FROM supplier_contacts WHERE supplier_id = ?", [id]
        );

        if (existingContacts.length > 0) {
            // Contact exists, update it
            if (contact_person || phone_number) { // Only update if new contact info is provided
                await connection.query(
                    `UPDATE supplier_contacts SET contact_person = ?, phone_number = ?
                     WHERE supplier_id = ?`,
                    [contact_person || null, phone_number || null, id]
                );
            } else {
                // If no contact_person and no phone_number provided for an existing contact,
                // you might choose to delete the contact row, or leave it (current behavior)
                // For simplicity, we'll leave it. If contact_person is mandatory for existing contact, handle that.
            }
        } else {
            // No existing contact, insert if contact_person or phone_number is provided
            if (contact_person || phone_number) {
                await connection.query(
                    `INSERT INTO supplier_contacts (supplier_id, contact_person, phone_number)
                     VALUES (?, ?, ?)`,
                    [id, contact_person || null, phone_number || null]
                );
            }
        }

        await connection.commit();

        // Fetch the updated supplier with potentially updated contact to return
        const [updatedSupplierData] = await connection.query(
             `SELECT
                s.supplier_id, s.supplier_name, s.email, s.address, s.created_at,
                sc.contact_person, sc.phone_number
             FROM suppliers s
             LEFT JOIN supplier_contacts sc ON s.supplier_id = sc.supplier_id
             WHERE s.supplier_id = ?`,
            [id]
        );

        res.status(200).json(updatedSupplierData[0] || { message: "Supplier updated successfully." });

    } catch (error) {
        await connection.rollback();
        console.error(`🚨 Error updating supplier ${id} (Transaction Rolled Back):`, error);
         if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ error: "Update failed: Supplier with this name or email might already exist (if unique)." });
        }
        res.status(500).json({ error: "Failed to update supplier due to an internal server error." });
    } finally {
        connection.release();
    }
};