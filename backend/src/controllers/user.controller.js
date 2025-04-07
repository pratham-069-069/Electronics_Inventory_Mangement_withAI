// src/controllers/user.controller.js
import pool from '../config/db.js'; // Make sure the path to your db config is correct

// **IMPORTANT**: For a real application, you MUST implement password hashing (e.g., bcrypt)
// where indicated below instead of storing/comparing plain text passwords.
// Example (install bcrypt: npm install bcrypt):
// import bcrypt from 'bcrypt';
// const saltRounds = 10; // Or read from config

/**
 * @description Get all users (excluding password hash)
 * @route GET /api/users
 */
export const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT user_id, full_name, email, phone_number, role, created_at FROM users ORDER BY full_name"
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error fetching users." });
    }
};

/**
 * @description Add a new user
 * @route POST /api/users
 */
export const addUser = async (req, res) => {
    // Destructure expected fields from the request body
    const { full_name, email, password_hash, phone_number, role } = req.body;

    // --- Basic Input Validation ---
    if (!full_name || !email || !password_hash) { // password_hash is required by this logic
        return res.status(400).json({ error: "Full name, email, and password are required." });
    }
    // Add more validation if needed (e.g., email format, password complexity)

    // --- Password Hashing (CRITICAL for security) ---
    // **INSECURE**: Storing plain text password directly from password_hash field.
    // **TODO**: Replace this with actual hashing in a real application.
    // Example using bcrypt:
    // let hashedPassword;
    // try {
    //     hashedPassword = await bcrypt.hash(password_hash, saltRounds);
    // } catch (hashError) {
    //     console.error("🚨 Password Hashing Error:", hashError);
    //     return res.status(500).json({ error: "Error processing password." });
    // }
    const plainPasswordForDemo = password_hash; // Using plain text for now based on request

    try {
        // Insert user into the database
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, phone_number, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING user_id, full_name, email, phone_number, role, created_at`, // Return user details (excluding hash)
            [
                full_name,
                email,
                plainPasswordForDemo, // **TODO**: Use 'hashedPassword' here in production
                phone_number, // Use phone_number or null
                role || "employee" // Default role if not provided
            ]
        );

        // Send back the newly created user data (confirming success)
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("🚨 Error adding user:", error);
        // Handle specific database errors
        if (error.code === '23505') { // Unique constraint violation (e.g., email already exists)
             return res.status(409).json({ error: "Email address already in use." });
        }
        // Generic error for other database issues
        res.status(500).json({ error: "Internal Server Error adding user." });
    }
};

/**
 * @description Log in a user
 * @route POST /api/users/login
 */
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // --- Basic Input Validation ---
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        // Find user by email
        const result = await pool.query(
            "SELECT user_id, full_name, email, phone_number, role, created_at, password_hash FROM users WHERE email = $1",
            [email]
        );

        // Check if user exists
        if (result.rows.length === 0) {
            // Use a generic error message for security (don't reveal if email exists)
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = result.rows[0];

        // --- Password Comparison (CRITICAL for security) ---
        // **INSECURE**: Comparing plain text password from request with stored plain text hash.
        // **TODO**: Replace this with hash comparison in a real application.
        // Example using bcrypt:
        // let isMatch = false;
        // try {
        //     isMatch = await bcrypt.compare(password, user.password_hash);
        // } catch (compareError) {
        //     console.error("🚨 Password Comparison Error:", compareError);
        //     return res.status(500).json({ error: "Error during login process." });
        // }
        const isMatch = (password === user.password_hash); // Plain text comparison for demo

        if (!isMatch) {
            // Passwords don't match
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // --- Login Successful ---
        // **TODO**: Implement secure session management (e.g., JWT tokens, session cookies) here.
        // For now, just return user info (excluding the password hash).
        const { password_hash, ...userWithoutPassword } = user;
        res.status(200).json({ message: "Login successful", user: userWithoutPassword });

    } catch (error) {
        console.error("🚨 Error during login:", error);
        res.status(500).json({ error: "Internal Server Error during login." });
    }
};

/**
 * @description Delete a user by ID
 * @route DELETE /api/users/:id
 */
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    // Basic validation for the ID parameter
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid user ID is required in the URL parameter.' });
    }

    try {
        // Execute the DELETE query
        const result = await pool.query(
            "DELETE FROM users WHERE user_id = $1 RETURNING user_id",
            [id]
        );

        // Check if any row was deleted
        if (result.rowCount === 0) {
            return res.status(404).json({ error: `User with ID ${id} not found.` });
        }

        // If deletion was successful
        console.log(`✅ User with ID ${id} deleted successfully.`);
        res.status(200).json({ message: `User with ID ${id} deleted successfully.` });

    } catch (error) {
        console.error(`🚨 Error deleting user ${id}:`, error);

        // Handle specific database errors, like foreign key constraints
        if (error.code === '23503') {
            return res.status(409).json({ error: `Cannot delete user ID ${id}. They are referenced in other records (e.g., sales, reports). Consider deactivating instead.` });
        }

        // Generic server error for other issues
        res.status(500).json({ error: "Failed to delete user due to an internal server error." });
    }
};