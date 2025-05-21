import mysql from 'mysql2/promise'; // Use the promise-based API
import dotenv from 'dotenv';
dotenv.config(); // Ensure env vars are loaded

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Adjust as needed
    queueLimit: 0,
    // Add SSL options if your MySQL server requires it
    // ssl: {
    //   ca: fs.readFileSync('/path/to/ca-cert.pem'), // Example
    //   rejectUnauthorized: true // Or false depending on your setup
    // }
});

// Test the connection (optional, but good for setup)
pool.getConnection()
    .then(connection => {
        console.log('✅ Connected to MySQL successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('🚨 Error connecting to MySQL:', err.stack);
        // Optional: process.exit(-1); // Decide if errors are fatal
    });

// No explicit 'error' event listener like pg pool, errors are typically handled per query/connection
// However, you can add listeners if the driver supports specific events for the pool itself.

export default pool;