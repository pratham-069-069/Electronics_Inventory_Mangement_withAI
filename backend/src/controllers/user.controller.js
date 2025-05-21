// src/controllers/user.controller.js
import pool from '../config/db.js';
// import bcrypt from 'bcrypt'; // Uncomment if you implement bcrypt
// const saltRounds = 10;

export const getAllUsers = async (req, res) => {
    try {
        const [results] = await pool.query(
            "SELECT user_id, full_name, email, phone_number, role, created_at FROM users ORDER BY full_name"
        );
        res.status(200).json(results);
    } catch (error) {
        console.error("🚨 Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error fetching users." });
    }
};

export const addUser = async (req, res) => {
    const { full_name, email, password_hash, phone_number, role } = req.body;
    if (!full_name || !email || !password_hash) {
        return res.status(400).json({ error: "Full name, email, and password are required." });
    }
    // **TODO: Implement bcrypt hashing for password_hash here**
    // const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
    const plainPasswordForDemo = password_hash; // Using plain text for now

    try {
        const [resultMeta] = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, phone_number, role)
             VALUES (?, ?, ?, ?, ?)`,
            [full_name, email, plainPasswordForDemo, phone_number, role || "employee"]
        );
        // Fetch the newly created user (excluding password)
        const [newUserRows] = await pool.query(
            "SELECT user_id, full_name, email, phone_number, role, created_at FROM users WHERE user_id = ?",
            [resultMeta.insertId]
        );
        res.status(201).json(newUserRows[0]);
    } catch (error) {
        console.error("🚨 Error adding user:", error);
        // MySQL error code for unique constraint is 1062 (ER_DUP_ENTRY)
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
             return res.status(409).json({ error: "Email address already in use." });
        }
        res.status(500).json({ error: "Internal Server Error adding user." });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }
    try {
        const [results] = await pool.query(
            "SELECT user_id, full_name, email, phone_number, role, created_at, password_hash FROM users WHERE email = ?",
            [email]
        );
        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        const user = results[0];
        // **TODO: Implement bcrypt.compare for password_hash here**
        // const isMatch = await bcrypt.compare(password, user.password_hash);
        const isMatch = (password === user.password_hash); // Plain text comparison

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        const { password_hash, ...userWithoutPassword } = user;
        res.status(200).json({ message: "Login successful", user: userWithoutPassword });
    } catch (error) {
        console.error("🚨 Error during login:", error);
        res.status(500).json({ error: "Internal Server Error during login." });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid user ID is required in the URL parameter.' });
    }
    try {
        const [result] = await pool.query(
            "DELETE FROM users WHERE user_id = ?",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `User with ID ${id} not found.` });
        }
        console.log(`✅ User with ID ${id} deleted successfully.`);
        res.status(200).json({ message: `User with ID ${id} deleted successfully.` });
    } catch (error) {
        console.error(`🚨 Error deleting user ${id}:`, error);
        // MySQL foreign key error code is typically 1451
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(409).json({ error: `Cannot delete user ID ${id}. They are referenced in other records.` });
        }
        res.status(500).json({ error: "Failed to delete user due to an internal server error." });
    }
};