import dotenv from 'dotenv';
dotenv.config(); // Load environment variables early

import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js'; // This now imports the MySQL pool
import mainRouter from './src/routes/index.js'; // Import the main router

const app = express();

// Essential Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// Database Connection Check (for MySQL)
// We test the connection by trying to get a connection from the pool
// This was already added in the updated db.js, but keeping a log here is fine too.
pool.getConnection()
    .then(connection => {
        console.log("✅ Connected to MySQL successfully (server.js check)!");
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error("🚨 MySQL Connection Error (server.js check):", err.stack);
        // Consider if this should be a fatal error for your application
        // process.exit(1);
    });

// Mount All API Routes
app.use('/api', mainRouter); // Prefix all routes with /api

// Basic Error Handling Middleware (Keep as is, or enhance)
app.use((err, req, res, next) => {
    console.error("🚨 Unhandled Error:", err.stack);
    // Avoid sending stack trace to client in production
    const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error'; // Send specific message in dev
    const errorStack = process.env.NODE_ENV === 'production' ? null : err.stack;

    res.status(err.status || 500).json({
        error: errorMessage,
        ...(errorStack && { stack: errorStack }) // Conditionally add stack
    });
});

// Not Found Handler (for unhandled routes)
app.use((req, res, next) => {
    res.status(404).json({ error: `Not Found - ${req.method} ${req.originalUrl}` });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🚀 API available at http://localhost:${PORT}/api`);
});