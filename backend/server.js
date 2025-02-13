import dotenv from 'dotenv';
dotenv.config(); // ✅ Load environment variables

import express from 'express';
import pg from 'pg';
import cors from 'cors';
import OpenAI from 'openai';
import faqData from './faq.json' assert { type: 'json' };
import { translate } from '@vitalets/google-translate-api';

const { Pool } = pg;

// ✅ PostgreSQL Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false 
});

pool.connect()
    .then(() => console.log("✅ Connected to PostgreSQL successfully!"))
    .catch(err => console.error("🚨 PostgreSQL Connection Error:", err));

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize NVIDIA OpenAI-compatible API
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// ✅ Store Chat History for Users
const chatHistory = {};

// ✅ Function to Translate Text
const translateText = async (text, targetLanguage) => {
    try {
        const res = await translate(text, { to: targetLanguage });
        return res.text;
    } catch (error) {
        console.error("🚨 Translation Error:", error);
        return text;
    }
};

// ✅ Detect Language
const detectLanguage = async (text) => {
    try {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return 'en';
        }
        const res = await translate(text, { to: 'en' });
        return res?.from?.language?.iso || 'en';
    } catch (error) {
        console.error("🚨 Language Detection Error:", error);
        return 'en';
    }
};

// ✅ Database Query Handler
const handleDatabaseQuery = async (message) => {
    const queryMapping = {
        "suppliers": "SELECT supplier_id, supplier_name, supplier_email FROM suppliers",
        "total suppliers": "SELECT COUNT(*) as total_suppliers FROM suppliers",
        "products": "SELECT product_id, product_name, product_price, stock_quantity FROM products",
        "low stock": "SELECT product_name, stock_quantity FROM products WHERE stock_quantity < 50 ORDER BY stock_quantity ASC",
        "recent sales": "SELECT p.product_name, s.quantity_sold, s.total_price, s.sale_date FROM sales s JOIN products p ON s.product_id = p.product_id ORDER BY s.sale_date DESC LIMIT 10"
    };

    const matchedQuery = Object.entries(queryMapping).find(([key]) => message.toLowerCase().includes(key));

    if (matchedQuery) {
        try {
            const result = await pool.query(matchedQuery[1]);
            return formatDatabaseResult(result);
        } catch (error) {
            console.error("Database Query Error:", error);
            return "Error processing database query.";
        }
    }

    return "I couldn't find relevant database information for your request.";
};

// ✅ Format Database Results Readably
const formatDatabaseResult = (result) => {
    if (result.rows.length === 0) {
        return "No data found.";
    }
    let response = "📊 **Database Result:**\n";
    result.rows.forEach((row, index) => {
        response += `Entry ${index + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
            response += `- ${key}: ${value}\n`;
        });
        response += "\n";
    });
    return response;
};

// ✅ Get all products from the database
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query("SELECT product_id, product_name, product_price, stock_quantity, product_category FROM products");
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products from the database." });
    }
});
app.post('/products', async (req, res) => {
    const { product_name, product_category, product_price, stock_quantity } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO products (product_name, product_category, product_price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *",
            [product_name, product_category, product_price, stock_quantity]
        );
        res.json(result.rows[0]); // Return the added product
    } catch (error) {
        console.error("🚨 Error adding product:", error);
        res.status(500).json({ error: "Failed to add product" });
    }
});

app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM products WHERE product_id = $1", [id]);
        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("🚨 Error deleting product:", error);
        res.status(500).json({ error: "Failed to delete product" });
    }
});

// ✅ Get all suppliers
app.get('/suppliers', async (req, res) => {
    try {
        const result = await pool.query("SELECT supplier_id, supplier_name, supplier_email, supplier_phone FROM suppliers");
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching suppliers:", error);
        res.status(500).json({ error: "Error fetching suppliers from the database." });
    }
});

// ✅ Add a new supplier
app.post('/suppliers', async (req, res) => {
    const { supplier_name, supplier_email, supplier_phone } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO suppliers (supplier_name, supplier_email, supplier_phone) VALUES ($1, $2, $3) RETURNING *",
            [supplier_name, supplier_email, supplier_phone]
        );
        res.json(result.rows[0]); // Return the added supplier
    } catch (error) {
        console.error("🚨 Error adding supplier:", error);
        res.status(500).json({ error: "Failed to add supplier" });
    }
});


// ✅ Delete a supplier
app.delete('/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM suppliers WHERE supplier_id = $1", [id]);
        res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
        console.error("🚨 Error deleting supplier:", error);
        res.status(500).json({ error: "Failed to delete supplier" });
    }
});

app.get('/dashboard-stats', async (req, res) => {
    try {
        const totalProducts = await pool.query("SELECT COUNT(*) AS count FROM products");
        const activeSuppliers = await pool.query("SELECT COUNT(*) AS count FROM suppliers");
        const lowStockAlerts = await pool.query("SELECT COUNT(*) AS count FROM inventory_alerts WHERE alert_type = 'low stock'");
        const totalSales = await pool.query("SELECT SUM(total_price) AS sum FROM sales");

        res.json({
            totalProducts: totalProducts.rows[0].count,
            activeSuppliers: activeSuppliers.rows[0].count,
            lowStockAlerts: lowStockAlerts.rows[0].count,
            totalSales: totalSales.rows[0].sum || 0
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

// ✅ Get all sales
app.get('/sales', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT sales_id, product_id, quantity_sold, total_price, sold_by_user_id, sale_date FROM sales ORDER BY sale_date DESC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching sales:", error);
        res.status(500).json({ error: "Error fetching sales from the database." });
    }
});

// ✅ Add a new sale
app.post('/sales', async (req, res) => {
    const { product_id, quantity_sold, total_price, sold_by_user_id } = req.body;

    try {
        // 1️⃣ Reduce stock quantity
        const updateStock = await pool.query(`
            UPDATE products 
            SET stock_quantity = stock_quantity - $1 
            WHERE product_id = $2 
            RETURNING stock_quantity;
        `, [quantity_sold, product_id]);

        if (updateStock.rows.length === 0) {
            return res.status(400).json({ error: "Product not found" });
        }

        const newStock = updateStock.rows[0].stock_quantity;

        // 2️⃣ Insert the sale into sales table
        const sale = await pool.query(`
            INSERT INTO sales (product_id, quantity_sold, total_price, sold_by_user_id) 
            VALUES ($1, $2, $3, $4) RETURNING *;
        `, [product_id, quantity_sold, total_price, sold_by_user_id]);

        // 3️⃣ Check if stock is below threshold and create an alert
        const thresholdCheck = await pool.query(`
            SELECT threshold_quantity FROM inventory_alerts WHERE product_id = $1;
        `, [product_id]);

        if (thresholdCheck.rows.length > 0 && newStock <= thresholdCheck.rows[0].threshold_quantity) {
            await pool.query(`
                INSERT INTO inventory_alerts (product_id, alert_type, threshold_quantity) 
                VALUES ($1, 'low stock', $2) 
                ON CONFLICT (product_id) DO UPDATE 
                SET alert_date = CURRENT_TIMESTAMP;
            `, [product_id, thresholdCheck.rows[0].threshold_quantity]);
        }

        res.json(sale.rows[0]);
    } catch (error) {
        console.error("🚨 Error processing sale:", error);
        res.status(500).json({ error: "Failed to process sale" });
    }
});


app.get('/inventory-alerts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT alert_id, product_id, alert_type, threshold_quantity, alert_date 
            FROM inventory_alerts 
            ORDER BY alert_date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching inventory alerts:", error);
        res.status(500).json({ error: "Error fetching inventory alerts from database." });
    }
});


// ✅ Chatbot API with Multilingual Support
app.post('/chatbot', async (req, res) => {
    const { userId, message } = req.body;

    try {
        console.log("📨 User Message:", message);

        const userLanguage = await detectLanguage(message);
        const translatedMessage = userLanguage === 'en' ? message : await translateText(message, 'en');

        const dbResponse = await handleDatabaseQuery(translatedMessage);
        let reply = dbResponse !== "I couldn't find relevant database information for your request." ? dbResponse : "Let me check...";

        if (reply === "Let me check...") {
            const completion = await openai.chat.completions.create({
                model: "meta/llama-3.1-70b-instruct",
                messages: [
                    { "role": "system", "content": "You are a helpful AI assistant. Answer any general knowledge or conversational questions." },
                    { "role": "user", "content": translatedMessage }
                ],
                temperature: 0.7,
                max_tokens: 500
            });
            reply = completion.choices?.[0]?.message?.content || "I'm not sure.";
        }

        if (userLanguage !== 'en') {
            reply = await translateText(reply, userLanguage);
        }

        res.json({ reply });

    } catch (error) {
        console.error("🚨 Chatbot API Error:", error);
        res.status(500).json({ error: `❌ Error contacting chatbot: ${error.message}` });
    }
});

// 🚀 Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
