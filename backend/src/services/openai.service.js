import OpenAI from 'openai';
import pool from '../config/db.js';
import { formatDatabaseResult } from '../utils/formatter.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize NVIDIA OpenAI-compatible API
const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

// OpenAI Extraction Function
export async function extractQueryParamsFromMessage(message) {
    try {
        const prompt = `
            Extract the following information from the user message, return null when value is not provided:
            product_name: The name of the product (string or null).
            min_price: The lowest price mentioned (number or null).
            max_price: The highest price mentioned (number or null).
            product_category: The category of the product (string or null).

            User input: "${message}"

            Return the values strictly in JSON format like this: {"product_name": "value", "min_price": value, "max_price": value, "product_category": "value"}
            If a numeric value (price) is mentioned, return it as a number, not a string. If not mentioned, return null.
            `;
        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.1-70b-instruct", // Or your chosen model
            messages: [
                { "role": "system", "content": "You are an AI assistant specialized in extracting product query parameters (name, min_price, max_price, category) from user messages and returning them in JSON format. Ensure prices are numbers." },
                { "role": "user", "content": prompt }
            ],
            temperature: 0.1, // Low temp for precise extraction
            max_tokens: 200,
            response_format: { type: "json_object" },
        });

        if (!completion.choices?.[0]?.message?.content) {
            console.warn("🚨 OpenAI extraction returned empty/malformed response.");
            return { product_name: null, min_price: null, max_price: null, product_category: null };
        }

        const extracted_info = JSON.parse(completion.choices[0].message.content);

        // Basic validation/cleaning (optional but recommended)
        const cleanInfo = {
            product_name: extracted_info.product_name && typeof extracted_info.product_name === 'string' ? extracted_info.product_name : null,
            min_price: extracted_info.min_price !== null && !isNaN(parseFloat(extracted_info.min_price)) ? parseFloat(extracted_info.min_price) : null,
            max_price: extracted_info.max_price !== null && !isNaN(parseFloat(extracted_info.max_price)) ? parseFloat(extracted_info.max_price) : null,
            product_category: extracted_info.product_category && typeof extracted_info.product_category === 'string' ? extracted_info.product_category : null,
        };

        console.log("🔍 Extracted Params:", cleanInfo);
        return cleanInfo;

    } catch (error) {
        console.error("🚨 OpenAI extraction error:", error);
        // Return default nulls if parsing or API fails
        return { product_name: null, min_price: null, max_price: null, product_category: null };
    }
}

// OpenAI General Knowledge Function
export async function getOpenAIResponse(message) {
    try {
        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.1-70b-instruct", // Or your chosen model
            messages: [
                { "role": "system", "content": "You are a helpful AI assistant. Answer general knowledge or conversational questions concisely." },
                { "role": "user", "content": message }
            ],
            temperature: 0.7,
            max_tokens: 300 // Adjust as needed
        });
        return completion.choices?.[0]?.message?.content?.trim() || "I couldn't process that request. Could you please rephrase?";
    } catch (error) {
        console.error("🚨 OpenAI General Knowledge Error:", error);
        return "I'm sorry, an error occurred while trying to get that information.";
    }
}

// --- Intent Handlers (Database Queries) ---

export async function handleGetProductList(queryParams) {
    // Base query selects necessary fields
    let query = `
        SELECT p.product_id, pc.category_name, p.product_name, p.description, p.unit_price, p.current_stock
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (queryParams.product_name && queryParams.product_name.toLowerCase() !== "null") {
        query += ` AND p.product_name ILIKE $${paramIndex++}`;
        values.push(`%${queryParams.product_name}%`);
    }
    // Ensure prices are numbers before adding to query
    if (queryParams.min_price !== null) {
        query += ` AND p.unit_price >= $${paramIndex++}`;
        values.push(queryParams.min_price);
    }
    if (queryParams.max_price !== null) {
        query += ` AND p.unit_price <= $${paramIndex++}`;
        values.push(queryParams.max_price);
    }
    if (queryParams.product_category && queryParams.product_category.toLowerCase() !== "null") {
        // Query directly on category name using the JOIN
        query += ` AND pc.category_name ILIKE $${paramIndex++}`;
        values.push(`%${queryParams.product_category}%`);
    }

    query += " ORDER BY p.product_name;"; // Add ordering

    try {
        console.log("Executing Product List Query:", query, values);
        const result = await pool.query(query, values);
        return formatDatabaseResult(result);
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductList):", dbError);
        return "Sorry, I encountered an error while searching for products.";
    }
}

export async function handleGetProductCount() {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM products");
        return `Total number of unique products in stock: ${result.rows[0].count}`;
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductCount):", dbError);
        return "Sorry, I couldn't retrieve the product count.";
    }
}

export async function handleGetProductNameOnly() {
     try {
        const result = await pool.query("SELECT product_name FROM products ORDER BY product_name");
        return formatDatabaseResult(result, true); // Pass true to selectOnlyName
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductNameOnly):", dbError);
        return "Sorry, I couldn't retrieve the product names.";
    }
}

export async function handleGetSupplierCount() {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM suppliers");
        return `We currently work with ${result.rows[0].count} suppliers.`;
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetSupplierCount):", dbError);
        return "Sorry, I couldn't retrieve the supplier count.";
    }
}

// Add other specific handlers if needed (e.g., handleGetSpecificProductDetails)