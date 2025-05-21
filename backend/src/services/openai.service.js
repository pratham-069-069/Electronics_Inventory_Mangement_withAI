// openai.service.js - Changes are for database query syntax

import OpenAI from 'openai';
import pool from '../config/db.js'; // Ensure this points to your MySQL pool
import { formatDatabaseResult } from '../utils/formatter.js';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function extractQueryParamsFromMessage(message) {
    // ... (OpenAI extraction logic remains the same as it doesn't interact with DB directly here)
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
            model: "meta/llama-3.1-70b-instruct",
            messages: [
                { "role": "system", "content": "You are an AI assistant specialized in extracting product query parameters (name, min_price, max_price, category) from user messages and returning them in JSON format. Ensure prices are numbers." },
                { "role": "user", "content": prompt }
            ],
            temperature: 0.1,
            max_tokens: 200,
            response_format: { type: "json_object" },
        });

        if (!completion.choices?.[0]?.message?.content) {
            console.warn("🚨 OpenAI extraction returned empty/malformed response.");
            return { product_name: null, min_price: null, max_price: null, product_category: null };
        }
        const extracted_info = JSON.parse(completion.choices[0].message.content);
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
        return { product_name: null, min_price: null, max_price: null, product_category: null };
    }
}

export async function getOpenAIResponse(message) {
    // ... (OpenAI general knowledge logic remains the same)
    try {
        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
                { "role": "system", "content": "You are a helpful AI assistant. Answer general knowledge or conversational questions concisely." },
                { "role": "user", "content": message }
            ],
            temperature: 0.7,
            max_tokens: 300
        });
        return completion.choices?.[0]?.message?.content?.trim() || "I couldn't process that request. Could you please rephrase?";
    } catch (error) {
        console.error("🚨 OpenAI General Knowledge Error:", error);
        return "I'm sorry, an error occurred while trying to get that information.";
    }
}

export async function handleGetProductList(queryParams) {
    let query = `
        SELECT p.product_id, pc.category_name, p.product_name, p.description, p.unit_price, p.current_stock
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        WHERE 1=1
    `;
    const values = [];

    if (queryParams.product_name && queryParams.product_name.toLowerCase() !== "null") {
        query += ` AND p.product_name LIKE ?`; // Changed ILIKE to LIKE, $ to ?
        values.push(`%${queryParams.product_name}%`);
    }
    if (queryParams.min_price !== null) {
        query += ` AND p.unit_price >= ?`;
        values.push(queryParams.min_price);
    }
    if (queryParams.max_price !== null) {
        query += ` AND p.unit_price <= ?`;
        values.push(queryParams.max_price);
    }
    if (queryParams.product_category && queryParams.product_category.toLowerCase() !== "null") {
        query += ` AND pc.category_name LIKE ?`; // Changed ILIKE to LIKE, $ to ?
        values.push(`%${queryParams.product_category}%`);
    }
    query += " ORDER BY p.product_name;";

    try {
        console.log("Executing Product List Query:", query, values);
        const [results] = await pool.query(query, values); // mysql2 returns [rows, fields]
        return formatDatabaseResult({ rows: results }); // Pass an object similar to pg result structure to formatter
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductList):", dbError);
        return "Sorry, I encountered an error while searching for products.";
    }
}

export async function handleGetProductCount() {
    try {
        const [results] = await pool.query("SELECT COUNT(*) AS count FROM products");
        return `Total number of unique products in stock: ${results[0].count}`;
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductCount):", dbError);
        return "Sorry, I couldn't retrieve the product count.";
    }
}

export async function handleGetProductNameOnly() {
     try {
        const [results] = await pool.query("SELECT product_name FROM products ORDER BY product_name");
        return formatDatabaseResult({ rows: results }, true); // Pass object with rows, selectOnlyName
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductNameOnly):", dbError);
        return "Sorry, I couldn't retrieve the product names.";
    }
}

export async function handleGetSupplierCount() {
    try {
        const [results] = await pool.query("SELECT COUNT(*) AS count FROM suppliers");
        return `We currently work with ${results[0].count} suppliers.`;
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetSupplierCount):", dbError);
        return "Sorry, I couldn't retrieve the supplier count.";
    }
}