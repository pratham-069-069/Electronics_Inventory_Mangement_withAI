import dotenv from 'dotenv';
dotenv.config(); // Load environment variables early

import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js'; // Import the pool after config
import mainRouter from './src/routes/index.js'; // Import the main router

const app = express();

// Essential Middleware
app.use(cors());
app.use(express.json());

// Database Connection Check (Optional but good)
pool.connect()
    .then(() => console.log("✅ Connected to PostgreSQL successfully!"))
    .catch(err => console.error("🚨 PostgreSQL Connection Error:", err.stack)); // Log stack trace

// Mount All API Routes
app.use('/api', mainRouter); // Prefix all routes with /api

// Basic Error Handling Middleware (Add more robust handling as needed)
app.use((err, req, res, next) => {
    console.error("🚨 Unhandled Error:", err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));