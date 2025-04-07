import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config(); // Ensure env vars are loaded

const { Pool } = pg;

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Common practice for Heroku/cloud DBs
});

// Log connection errors on the pool itself
pool.on('error', (err, client) => {
  console.error('🚨 Unexpected error on idle client', err.stack);
  // Optional: process.exit(-1); // Decide if errors are fatal
});

export default pool;