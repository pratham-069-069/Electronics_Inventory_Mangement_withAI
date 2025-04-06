import dotenv from 'dotenv';
dotenv.config();

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

// ✅ Get all users
app.get("/users", async (req, res) => {
    try {
        const result = await pool.query("SELECT user_id, full_name, email, phone_number, role, created_at FROM users");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Add a new user (WITHOUT bcrypt hashing)
app.post("/users", async (req, res) => {
    const { full_name, email, password_hash, phone_number, role } = req.body; // Get the password directly
    if (!full_name || !email || !password_hash) { // Password is now required
        return res.status(400).json({ error: "Full name, email, and password are required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO users (full_name, email, password_hash, phone_number, role) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, full_name, email, phone_number, role, created_at",
            [full_name, email, password_hash, phone_number, role || "employee"]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ User Login (WITHOUT bcrypt comparison)
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const user = result.rows[0];

        if (user.password_hash !== password) { // INSECURE: Plain text comparison
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

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

// ✅ Format Database Results Readably
const formatDatabaseResult = (result, selectOnlyName = false) => {
    if (result.rows.length === 0) {
        return "No data found.";
    }

    let response = "📊 **Database Result:**\n";

    result.rows.forEach((row, index) => {
        response += `Entry ${index + 1}:\n`;
        if (selectOnlyName) {
            response += `- product_name: ${row.product_name}\n`;
        } else {
            Object.entries(row).forEach(([key, value]) => {
                response += `- ${key}: ${value}\n`;
            });
        }
        response += "\n";
    });

    return response;
};

// ✅ OpenAI Extraction Function
async function extractQueryParamsFromMessage(message) {
    try {
        const prompt = `
            Extract the following information from the user message, return null when value is not provided:
            product_name: The name of the product (or null if not provided).
            min_price: The lowest price from the user input (or null if not provided).
            max_price: The highest price from the user input (or null if not provided).
            product_category: The category of the product (or null if not provided).

            Here's the user input:
            ${message}

            Return the values in JSON format.
            `;
        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
                { "role": "system", "content": "You are a helpful AI assistant that is good at extracting entities from user messages and returning the result in JSON format." },
                { "role": "user", "content": prompt }
            ],
            temperature: 0.2,
            max_tokens: 200,
            response_format: { type: "json_object" }, // forces json_object,
        });

        if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message?.content) {
            console.warn("🚨 OpenAI returned an empty or malformed response.");
            return { product_name: null, min_price: null, max_price: null, product_category: null };
        }
        const extracted_info = JSON.parse(completion.choices[0].message.content);
        return extracted_info;

    } catch (error) {
        console.error("🚨 OpenAI extraction error:", error);
        return { product_name: null, min_price: null, max_price: null, product_category: null }; // Return nulls in case of error
    }
}

// ✅ OpenAI General Knowledge Function
async function getOpenAIResponse(message) {
    try {
        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
                { "role": "system", "content": "You are a helpful AI assistant. Answer any general knowledge or conversational questions." },
                { "role": "user", "content": message }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        return completion.choices?.[0]?.message?.content || "I'm not sure.";
    } catch (error) {
        console.error("🚨 OpenAI General Knowledge Error:", error);
        return "I'm sorry, I couldn't retrieve the information.";
    }
}

// ✅ Intent Handlers

async function handleGetProductList(queryParams) {
    let query = "SELECT product_id, category_id, product_name, description, unit_price, current_stock FROM products WHERE 1=1";
    const values = [];
    let paramIndex = 1;

    if (queryParams.product_name && queryParams.product_name !== "null") {
        query += ` AND product_name ILIKE $${paramIndex++}`;
        values.push(`%${queryParams.product_name}%`);
    }

    if (queryParams.min_price !== null && queryParams.min_price !== "null") {
        query += ` AND unit_price >= $${paramIndex++}`; // Use unit_price
        values.push(parseFloat(queryParams.min_price));
    }

    if (queryParams.max_price !== null && queryParams.max_price !== "null") {
        query += ` AND unit_price <= $${paramIndex++}`; // Use unit_price
        values.push(parseFloat(queryParams.max_price));
    }

    if (queryParams.product_category && queryParams.product_category !== "null") {
        query += ` AND category_id IN (SELECT category_id FROM product_categories WHERE category_name ILIKE $${paramIndex++})`;
        values.push(`%${queryParams.product_category}%`);
    }

    const result = await pool.query(query, values);
    return formatDatabaseResult(result);
}

async function handleGetProductCount() {
    const result = await pool.query("SELECT COUNT(*) FROM products");
    return `Total product count: ${result.rows[0].count}`;
}

async function handleGetProductNameOnly() {
    const result = await pool.query("SELECT product_name FROM products");
    return formatDatabaseResult(result, true); // Pass true to selectOnlyName
}

async function handleGetGeneralKnowledge(message) {
    return await getOpenAIResponse(message);
}

// ✅ Chatbot API with Multilingual Support
app.post('/chatbot', async (req, res) => {
    const { userId, message } = req.body;

    try {
        console.log("📨 User Message:", message);

        const userLanguage = await detectLanguage(message);
        const translatedMessage = userLanguage === 'en' ? message : await translateText(message, 'en');

        let reply;

        // Intent recognition using keywords/regex (Prioritize inventory-related intents)
        if (translatedMessage.toLowerCase().match(/^(hi|hello|hey)\b/)) {
            reply = "Hello! How can I help you today?";
        } else if (translatedMessage.toLowerCase().includes("count of total products") || translatedMessage.toLowerCase().includes("how many products")) {
            reply = await handleGetProductCount();
        } else if (translatedMessage.toLowerCase().includes("only the name")) {
            reply = await handleGetProductNameOnly();
        } else if (translatedMessage.toLowerCase().includes("name of the products") || translatedMessage.toLowerCase().includes("product details") || translatedMessage.toLowerCase().includes("give me products") ) {
            const queryParams = await extractQueryParamsFromMessage(translatedMessage);
            reply = await handleGetProductList(queryParams);
        } else if (translatedMessage.toLowerCase().includes("how many suppliers") || translatedMessage.toLowerCase().includes("count of suppliers")) {
            reply = await handleGetSupplierCount();
        }
        else {
            // Default to general knowledge (Use OpenAI as a last resort)
            reply = await handleGetGeneralKnowledge(translatedMessage);
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

// ✅ Get all products from the database
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query("SELECT product_id, category_id, product_name, description, unit_price, current_stock, created_at FROM products");
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products from the database." });
    }
});

app.post('/products', async (req, res) => {
    const { category_id, product_name, description, unit_price, current_stock } = req.body; // Use category_id
    try {
        const result = await pool.query(
            "INSERT INTO products (category_id, product_name, description, unit_price, current_stock) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [category_id, product_name, description, unit_price, current_stock] //order matters
        );
        res.json(result.rows[0]);
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
        const result = await pool.query("SELECT supplier_id, supplier_name, contact_person, email, phone_number, address FROM suppliers");
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
            "SELECT sales_id, customer_id, sold_by_user_id, sale_date, subtotal, tax_amount, total_amount, payment_method, payment_status FROM sales ORDER BY sale_date DESC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching sales:", error);
        res.status(500).json({ error: "Error fetching sales from the database." });
    }
});

// ✅ Add a new sale (updated for new schema)
app.post('/sales', async (req, res) => {
    const { customer_id, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status, product_id, quantity_sold, unit_price } = req.body;

    try {

        // 1️⃣ Insert the sale into sales table
        const sale = await pool.query(`
            INSERT INTO sales (customer_id, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `, [customer_id, sold_by_user_id, subtotal, tax_amount, total_amount, payment_method, payment_status]);

        const salesId = sale.rows[0].sales_id;

        // 2️⃣ Insert the item into the sales_items table
        const saleItem = await pool.query(`
                INSERT INTO sales_items (sales_id, product_id, quantity_sold, unit_price, item_total)
                VALUES ($1, $2, $3, $4, $5) RETURNING *;
            `, [salesId, product_id, quantity_sold, unit_price, quantity_sold * unit_price ]);

        // 3️⃣ Reduce stock quantity
        const updateStock = await pool.query(`
            UPDATE products
            SET current_stock = current_stock - $1
            WHERE product_id = $2
            RETURNING current_stock;
        `, [quantity_sold, product_id]);

        if (updateStock.rows.length === 0) {
            return res.status(400).json({ error: "Product not found" });
        }

        const newStock = updateStock.rows[0].current_stock;

        // 4️⃣ Check if stock is below threshold and create an alert
        const thresholdCheck = await pool.query(`
            SELECT threshold_quantity FROM inventory_alerts WHERE product_id = $1;
        `, [product_id]);

        if (thresholdCheck.rows.length > 0 && newStock <= thresholdCheck.rows[0].threshold_quantity) {
            await pool.query(`
                INSERT INTO inventory_alerts (product_id, alert_type, threshold_quantity)
                VALUES ($1, 'low_stock', $2)
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
// ✅ Get all purchase orders
app.get('/purchase-orders', async (req, res) => {
    try {
        const result = await pool.query("SELECT order_id, supplier_id, product_id, quantity_ordered, order_status, order_date FROM purchase_orders ORDER BY order_date DESC");
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching purchase orders:", error);
        res.status(500).json({ error: "Error fetching purchase orders from the database." });
    }
});

// ✅ Add a new purchase order
app.post('/purchase-orders', async (req, res) => {
    const { supplier_id, product_id, quantity_ordered, order_status } = req.body;

    if (!supplier_id || !product_id || !quantity_ordered) {
        return res.status(400).json({ error: "Supplier ID, Product ID, and Quantity Ordered are required." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO purchase_orders (supplier_id, product_id, quantity_ordered, order_status) VALUES ($1, $2, $3, $4) RETURNING *",
            [supplier_id, product_id, quantity_ordered, order_status || 'pending']
        );
        res.json(result.rows[0]); // Return the added purchase order
    } catch (error) {
        console.error("🚨 Error adding purchase order:", error);
        res.status(500).json({ error: "Failed to add purchase order" });
    }
});

// ✅ Update a purchase order
app.put('/purchase-orders/:id', async (req, res) => {
    const { id } = req.params;
    const { supplier_id, product_id, quantity_ordered, order_status } = req.body;

    try {
        const result = await pool.query(
            "UPDATE purchase_orders SET supplier_id = $1, product_id = $2, quantity_ordered = $3, order_status = $4 WHERE order_id = $5 RETURNING *",
            [supplier_id, product_id, quantity_ordered, order_status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Purchase order not found" });
        }
        res.json(result.rows[0]); // Return the updated purchase order
    } catch (error) {
        console.error("🚨 Error updating purchase order:", error);
        res.status(500).json({ error: "Failed to update purchase order" });
    }
});

// ✅ Delete a purchase order
app.delete('/purchase-orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM purchase_orders WHERE order_id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Purchase order not found" });
        }
        res.json({ message: "Purchase order deleted successfully" });
    } catch (error) {
        console.error("🚨 Error deleting purchase order:", error);
        res.status(500).json({ error: "Failed to delete purchase order" });
    }
});

// ✅ Get all reports
app.get('/reports', async (req, res) => {
    try {
        const result = await pool.query("SELECT report_id, report_name, generated_by_user_id, report_data, created_at FROM reports ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (error) {
        console.error("🚨 Error fetching reports:", error);
        res.status(500).json({ error: "Error fetching reports from the database." });
    }
});

// ✅ Add a new report
app.post('/reports', async (req, res) => {
    const { report_name, generated_by_user_id, report_data } = req.body;

    if (!report_name || !report_data) {
        return res.status(400).json({ error: "Report name and report data are required." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO reports (report_name, generated_by_user_id, report_data) VALUES ($1, $2, $3) RETURNING *",
            [report_name, generated_by_user_id, report_data]
        );
        res.json(result.rows[0]); // Return the added report
    } catch (error) {
        console.error("🚨 Error adding report:", error);
        res.status(500).json({ error: "Failed to add report" });
    }
});

// ✅ Update a report
app.put('/reports/:id', async (req, res) => {
    const { id } = req.params;
    const { report_name, generated_by_user_id, report_data } = req.body;

    try {
        const result = await pool.query(
            "UPDATE reports SET report_name = $1, generated_by_user_id = $2, report_data = $3 WHERE report_id = $4 RETURNING *",
            [report_name, generated_by_user_id, report_data, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }
        res.json(result.rows[0]); // Return the updated report
    } catch (error) {
        console.error("🚨 Error updating report:", error);
        res.status(500).json({ error: "Failed to update report" });
    }
});

// ✅ Delete a report
app.delete('/reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM reports WHERE report_id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }
        res.json({ message: "Report deleted successfully" });
    } catch (error) {
        console.error("🚨 Error deleting report:", error);
        res.status(500).json({ error: "Failed to delete report" });
    }
});


// 🚀 Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));