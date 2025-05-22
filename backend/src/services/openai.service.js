// openai.service.js
import OpenAI from 'openai';
import pool from '../config/db.js';
import { formatDatabaseResult } from '../utils/formatter.js'; // Assuming you have this
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function extractIntentAndEntities(message) {
    try {
        const prompt = `
            Analyze the user's message about an inventory management system. Identify the primary intent, the main database table being queried, and any filters or specific IDs mentioned.
            Possible intents: "get_count", "list_items", "get_item_details", "get_sum", "get_latest_item".
            Possible tables: "products", "sales", "customers", "suppliers", "purchase_orders", "returns_", "users", "inventory_alerts".
            Filters should be an array of objects like {"column": "name", "operator": "LIKE", "value": "%value%"}.
            If an ID is mentioned for details, capture it as "item_id".

            User input: "${message}"

            Return the response strictly in JSON format like this:
            {
              "intent": "your_identified_intent" | null,
              "target_table": "your_identified_table" | null,
              "item_id": number | string | null,
              "filters": [ {"column": "col_name", "operator": "op", "value": "val"} ] | null,
              "select_fields": ["field1", "field2"] | null,
              "order_by": {"column": "col_name", "direction": "ASC|DESC"} | null
            }
            If unsure, set intent and target_table to null.
            For 'LIKE' operator with product_name or category_name, add wildcards around the value (e.g., "%value%").
            For price filters, use operators like ">=", "<=", "=".
            If filters, select_fields, or order_by are not applicable or not found, return them as actual null (not the string "null").
        `;
        const completion = await openai.chat.completions.create({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
                { "role": "system", "content": "You are an AI assistant that analyzes user messages to extract structured query information (intent, table, filters, ID, select_fields, order_by) for a database. Return JSON. Ensure that if a field like filters, select_fields, or order_by is not applicable, its value is null, not the string 'null'." },
                { "role": "user", "content": prompt }
            ],
            temperature: 0.1,
            max_tokens: 450, // Slightly increased for potentially more complex JSON
            response_format: { type: "json_object" },
        });

        if (!completion.choices?.[0]?.message?.content) {
            console.warn("🚨 OpenAI intent/entity extraction returned empty/malformed response.");
            return { intent: null, target_table: null, item_id: null, filters: null, select_fields: null, order_by: null };
        }

        const extracted = JSON.parse(completion.choices[0].message.content);
        console.log("🔍 Extracted Intent & Entities:", extracted);

        // Ensure filters, select_fields, order_by are actual null if the LLM returns the string "null" or empty.
        const cleanExtracted = {
            ...extracted,
            item_id: (extracted.item_id === "null" || extracted.item_id === "") ? null : extracted.item_id,
            filters: (extracted.filters === "null" || !Array.isArray(extracted.filters) || extracted.filters.length === 0) ? null : extracted.filters,
            select_fields: (extracted.select_fields === "null" || !Array.isArray(extracted.select_fields) || extracted.select_fields.length === 0) ? null : extracted.select_fields,
            order_by: (extracted.order_by === "null" || typeof extracted.order_by !== 'object' || !extracted.order_by || !extracted.order_by.column) ? null : extracted.order_by,
        };
        console.log("🧼 Cleaned Extracted Info:", cleanExtracted);
        return cleanExtracted;

    } catch (error) {
        console.error("🚨 OpenAI Intent/Entity Extraction Error:", error);
        return { intent: null, target_table: null, item_id: null, filters: null, select_fields: null, order_by: null };
    }
}

export async function getOpenAIResponse(message) {
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

const ALLOWED_TABLES = ["products", "sales", "customers", "suppliers", "purchase_orders", "returns_", "users", "inventory_alerts", "product_categories", "supplier_contacts", "sales_items", "stock_transactions", "reports"];
const isValidColumnName = (colName) => colName && typeof colName === 'string' && /^[a-zA-Z0-9_.]+$/.test(colName);
const isValidTableName = (tableName) => tableName && typeof tableName === 'string' && ALLOWED_TABLES.includes(tableName.toLowerCase());


export async function handleGetCount(tableName, filters = []) {
    if (!isValidTableName(tableName)) {
        return "Sorry, I cannot query that specific information.";
    }

    let query = `SELECT COUNT(*) AS count FROM ${tableName} WHERE 1=1`;
    const values = [];

    if (Array.isArray(filters)) {
        filters.forEach(filter => {
            if (filter && isValidColumnName(filter.column) && filter.operator && filter.value !== undefined) {
                query += ` AND ${filter.column} ${filter.operator} ?`;
                values.push(filter.value);
            }
        });
    }

    try {
        console.log("Executing Count Query:", query, values);
        const [results] = await pool.query(query, values);
        return `There are ${results[0].count} ${tableName}.`;
    } catch (dbError) {
        console.error(`🚨 Database Query Error (handleGetCount - ${tableName}):`, dbError);
        return `Sorry, I couldn't retrieve the count for ${tableName}.`;
    }
}

export async function handleListItems(tableName, filters = [], selectFieldsArg = null, orderBy = null, limit = 10) {
    if (!isValidTableName(tableName)) {
        return "Sorry, I cannot list that specific information.";
    }

    const selectFields = (Array.isArray(selectFieldsArg) && selectFieldsArg.length > 0) ?
                         selectFieldsArg.filter(isValidColumnName).join(', ') || '*'
                         : '*';

    let query = `SELECT ${selectFields} FROM ${tableName} WHERE 1=1`;
    const values = [];

    if (Array.isArray(filters)) {
        filters.forEach(filter => {
            if (filter && isValidColumnName(filter.column) && filter.operator && filter.value !== undefined) {
                query += ` AND ${filter.column} ${filter.operator} ?`;
                values.push(filter.value);
            }
        });
    }

    if (orderBy && isValidColumnName(orderBy.column) && ['ASC', 'DESC'].includes(orderBy.direction?.toUpperCase())) {
        query += ` ORDER BY ${orderBy.column} ${orderBy.direction.toUpperCase()}`;
    } else if (tableName === "products") {
        query += ` ORDER BY product_name`;
    } else if (tableName === "sales") {
        query += ` ORDER BY sale_date DESC`;
    }
    // Add other default orderings if necessary

    query += ` LIMIT ?`;
    values.push(limit);

    try {
        console.log(`Executing List Query for ${tableName}:`, query, values);
        const [results] = await pool.query(query, values);
        return formatDatabaseResult({ rows: results });
    } catch (dbError) {
        console.error(`🚨 Database Query Error (handleListItems - ${tableName}):`, dbError);
        return `Sorry, I encountered an error while listing ${tableName}.`;
    }
}

export async function handleGetItemDetails(tableName, itemId) {
    const allowedTablesMap = {
        "products": "product_id", "sales": "sales_id", "customers": "customer_id",
        "suppliers": "supplier_id", "purchase_orders": "order_id", "returns_": "return_id",
        "users": "user_id", "inventory_alerts": "alert_id", "product_categories": "category_id",
        "supplier_contacts": "contact_id", "sales_items": "sales_item_id",
        "stock_transactions": "transaction_id", "reports": "report_id"
    };
    const idColumn = allowedTablesMap[tableName.toLowerCase()];

    if (!idColumn) {
        return "Sorry, I cannot fetch details for that type of item.";
    }
    const parsedItemId = parseInt(itemId);
    if (isNaN(parsedItemId)) {
        return "Please provide a valid ID number.";
    }

    let query;
    // Example complex queries for better details
    if (tableName.toLowerCase() === 'sales') {
        query = `
            SELECT s.*, c.full_name as customer_name, u.full_name as sold_by_user_name,
                   GROUP_CONCAT(CONCAT(p.product_name, ' (Qty: ', si.quantity_sold, ')') SEPARATOR '; ') as items_sold
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.customer_id
            LEFT JOIN users u ON s.sold_by_user_id = u.user_id
            LEFT JOIN sales_items si ON s.sales_id = si.sales_id
            LEFT JOIN products p ON si.product_id = p.product_id
            WHERE s.${idColumn} = ?
            GROUP BY s.sales_id, c.full_name, u.full_name; 
        `; // GROUP_CONCAT for MySQL
    } else if (tableName.toLowerCase() === 'products') {
        query = `
            SELECT p.*, pc.category_name
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE p.${idColumn} = ?
        `;
    } else if (tableName.toLowerCase() === 'purchase_orders') {
         query = `
            SELECT po.*, s.supplier_name, p.product_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN products p ON po.product_id = p.product_id
            WHERE po.${idColumn} = ?
        `;
    } else {
        query = `SELECT * FROM ${tableName} WHERE ${idColumn} = ?`;
    }

    try {
        console.log(`Executing Detail Query for ${tableName} ID ${parsedItemId}:`, query);
        const [results] = await pool.query(query, [parsedItemId]);
        if (results.length === 0) return `No ${tableName.slice(0, -1)} found with ID ${parsedItemId}.`;
        return formatDatabaseResult({ rows: results });
    } catch (dbError) {
        console.error(`🚨 Database Query Error (handleGetItemDetails - ${tableName}):`, dbError);
        return `Sorry, I couldn't retrieve details for that ${tableName.slice(0, -1)}.`;
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
        query += ` AND p.product_name LIKE ?`;
        values.push(`%${queryParams.product_name}%`);
    }
    if (queryParams.min_price !== null && !isNaN(queryParams.min_price)) {
        query += ` AND p.unit_price >= ?`;
        values.push(queryParams.min_price);
    }
    if (queryParams.max_price !== null && !isNaN(queryParams.max_price)) {
        query += ` AND p.unit_price <= ?`;
        values.push(queryParams.max_price);
    }
    if (queryParams.product_category && queryParams.product_category.toLowerCase() !== "null") {
        query += ` AND pc.category_name LIKE ?`;
        values.push(`%${queryParams.product_category}%`);
    }
    query += " ORDER BY p.product_name LIMIT 10;";
    try {
        console.log("Executing Product List Query (specialized):", query, values);
        const [results] = await pool.query(query, values);
        return formatDatabaseResult({ rows: results });
    } catch (dbError) {
        console.error("🚨 Database Query Error (handleGetProductList):", dbError);
        return "Sorry, I encountered an error while searching for products.";
    }
}

export async function handleGetProductCount() {
    try {
        const [results] = await pool.query("SELECT COUNT(*) AS count FROM products");
        return `Total number of unique products in stock: ${results[0].count}`;
    } catch (dbError) { /* ... */ }
}
export async function handleGetProductNameOnly() {
     try {
        const [results] = await pool.query("SELECT product_name FROM products ORDER BY product_name");
        return formatDatabaseResult({ rows: results }, true);
    } catch (dbError) { /* ... */ }
}
export async function handleGetSupplierCount() {
    try {
        const [results] = await pool.query("SELECT COUNT(*) AS count FROM suppliers");
        return `We currently work with ${results[0].count} suppliers.`;
    } catch (dbError) { /* ... */ }
}

export async function handleGetTotalSalesAmount(filters = []) {
    let query = `SELECT SUM(total_amount) AS total_sales_value FROM sales WHERE payment_status = 'completed'`;
    const values = [];
    if (Array.isArray(filters)) {
        filters.forEach(filter => {
            if (filter && isValidColumnName(filter.column) && filter.operator && filter.value !== undefined) {
                if (filter.column === 'sale_date' && filter.operator === 'BETWEEN' && Array.isArray(filter.value) && filter.value.length === 2) {
                    query += ` AND sale_date BETWEEN ? AND ?`;
                    values.push(filter.value[0], filter.value[1]);
                } else {
                    query += ` AND ${filter.column} ${filter.operator} ?`;
                    values.push(filter.value);
                }
            }
        });
    }
    try {
        console.log("Executing Total Sales Query:", query, values);
        const [results] = await pool.query(query, values);
        const totalSales = results[0].total_sales_value;
        return `The total sales amount is $${parseFloat(totalSales || 0).toFixed(2)}.`;
    } catch (dbError) { /* ... */ }
}

export async function handleGetPurchaseOrderStatus(orderId) {
    const parsedOrderId = parseInt(orderId);
    if (isNaN(parsedOrderId)) return "Please provide a valid purchase order ID.";
    try {
        const [results] = await pool.query(
            `SELECT po.order_status, p.product_name
             FROM purchase_orders po
             LEFT JOIN products p ON po.product_id = p.product_id
             WHERE po.order_id = ?`,
            [parsedOrderId]
        );
        if (results.length === 0) return `Purchase order with ID ${parsedOrderId} not found.`;
        return `The status for PO ${parsedOrderId} (Product: ${results[0].product_name || 'N/A'}) is: ${results[0].order_status}.`;
    } catch (dbError) { /* ... */ return "Error fetching PO status."; }
}