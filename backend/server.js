import dotenv from 'dotenv';
dotenv.config(); // ✅ Load environment variables

import express from 'express';
import pg from 'pg';
import cors from 'cors';
import OpenAI from 'openai';
import faqData from './faq.json' assert { type: 'json' };

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

// ✅ Function to Handle Database Queries with Correct Column Names
const handleDatabaseQuery = async (message) => {
    try {
        let result;

        // 📦 Stock Query: "How many stocks are left for product X?"
        if (message.includes("stock left for") || message.includes("inventory for")) {
            const productName = message.replace(/stock left for|inventory for/gi, "").trim();
            result = await pool.query(
                "SELECT stock_quantity FROM stock_transactions WHERE product_id IN (SELECT id FROM products WHERE name ILIKE $1) LIMIT 1",
                [productName]
            );

            if (result.rows.length === 0) return `❌ No stock information found for **${productName}**.`;
            return `📦 **Stock Left for ${productName}:** ${result.rows[0].stock_quantity}`;
        }

        // 🛒 Sales Query: "Show me recent sales"
        if (message.includes("recent sales")) {
            result = await pool.query(
                "SELECT p.name AS product_name, s.quantity_sold, s.total_price, s.sale_date FROM sales s JOIN products p ON s.product_id = p.id ORDER BY s.sale_date DESC LIMIT 5"
            );

            if (result.rows.length === 0) return "❌ No recent sales data found.";
            let response = "🛒 **Recent Sales:**\n";
            result.rows.forEach(row => {
                response += `- **${row.product_name}**: Sold ${row.quantity_sold} for **$${row.total_price}** on ${row.sale_date}\n`;
            });
            return response;
        }

        // 📦 Low Stock Alerts: "What products are low on stock?"
        if (message.includes("low stock")) {
            result = await pool.query(
                "SELECT p.name AS product_name, i.threshold FROM inventory_alerts i JOIN products p ON i.product_id = p.id WHERE i.alert_type = 'low stock'"
            );

            if (result.rows.length === 0) return "✅ All products are well-stocked!";
            let response = "⚠️ **Low Stock Alerts:**\n";
            result.rows.forEach(row => {
                response += `- **${row.product_name}**: Only ${row.threshold} units left.\n`;
            });
            return response;
        }

        // 🚚 Purchase Orders: "What purchase orders are pending?"
        if (message.includes("pending purchase orders")) {
            result = await pool.query(
                "SELECT p.name AS product_name, po.quantity_ordered, po.order_date FROM purchase_orders po JOIN products p ON po.product_id = p.id WHERE po.status = 'pending' ORDER BY po.order_date DESC"
            );

            if (result.rows.length === 0) return "❌ No pending purchase orders.";
            let response = "🚚 **Pending Purchase Orders:**\n";
            result.rows.forEach(row => {
                response += `- **${row.product_name}**: Ordered **${row.quantity_ordered}** units on ${row.order_date}\n`;
            });
            return response;
        }

        // 📊 Reports Query: "Show me recent reports"
        if (message.includes("recent reports")) {
            result = await pool.query(
                "SELECT report_name, created_at FROM reports ORDER BY created_at DESC LIMIT 5"
            );

            if (result.rows.length === 0) return "❌ No recent reports found.";
            let response = "📊 **Recent Reports:**\n";
            result.rows.forEach(row => {
                response += `- **${row.report_name}** (Created on ${row.created_at})\n`;
            });
            return response;
        }

        // 🚚 Supplier Info: "Who are the suppliers?"
        if (message.includes("suppliers")) {
            result = await pool.query(
                "SELECT name, contact_email, contact_phone FROM suppliers"
            );

            if (result.rows.length === 0) return "❌ No suppliers found.";
            let response = "🏭 **Suppliers:**\n";
            result.rows.forEach(row => {
                response += `- **${row.name}**: Email - ${row.contact_email}, Phone - ${row.contact_phone}\n`;
            });
            return response;
        }

        return null; // Let AI handle other queries

    } catch (error) {
        console.error("🚨 Database Query Error:", error);
        return "❌ Error fetching data from the database.";
    }
};

// 🤖 Chatbot API with FAQ & Database Integration
app.post('/chatbot', async (req, res) => {
    const { userId, message } = req.body;
    const lowerMessage = message.toLowerCase();

    try {
        // ✅ Step 1: Check FAQs
        if (faqData[lowerMessage]) {
            return res.json({ reply: faqData[lowerMessage] });
        }

        // ✅ Step 2: Check Database Queries
        const dbResponse = await handleDatabaseQuery(lowerMessage);
        if (dbResponse) {
            return res.json({ reply: dbResponse });
        }

        // ✅ Step 3: Maintain Chat History
        if (!chatHistory[userId]) {
            chatHistory[userId] = [];
        }
        chatHistory[userId].push({ role: "user", content: message });

        // ✅ Step 4: Use AI for Other Questions
        const completion = await openai.chat.completions.create({
            model: "nvidia/mistral-nemo-minitron-8b-8k-instruct",
            messages: [
                { "role": "system", "content": "You are an AI assistant for Smart Inventory System. Answer database-related questions before using AI." },
                ...chatHistory[userId]
            ],
            temperature: 0.5,
            max_tokens: 500,
        });

        let botReply = completion.choices?.[0]?.message?.content || "I'm not sure.";
        chatHistory[userId].push({ role: "assistant", content: botReply });

        res.json({ reply: botReply });

    } catch (error) {
        console.error("🚨 Chatbot API Error:", error);
        res.status(500).json({ error: '❌ Error connecting to chatbot API' });
    }
});

// 🚀 Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
