import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the GoogleGenAI client with your API key
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE_IF_NOT_USING_ENV" 
});

// Read the database schema
const schemaPath = path.join(__dirname, '../../schema.txt'); // Assuming schema.txt is two levels up
let dbSchema = '';
try {
    dbSchema = fs.readFileSync(schemaPath, 'utf8');
} catch (err) {
    console.error(`Error reading schema file at ${schemaPath}:`, err);
    // Potentially throw an error or use a default schema if critical
    // For now, we'll proceed with an empty schema if not found, but this is not ideal
}

async function generateSQLResponse(userInput) {
    try {
        const prompt = `
        You are a SQL expert assistant. Using the following MySQL database schema:
        
        ${dbSchema}
        
        User Question: ${userInput}
        
        Please:
        1. Analyze the user's question.
        2. Generate the appropriate SQL query using MySQL syntax.
        3. Provide a brief explanation of what the query does.
        4. Format your response as a JSON object with the following structure:
        {
            "sql": "THE_SQL_QUERY",
            "explanation": "Brief explanation of what the query does",
            "requiredTables": ["table1", "table2"] 
        }
        
        IMPORTANT: Return ONLY the JSON object. Do not include any markdown formatting, code blocks, or additional text.

        Rules:
        - Use valid MySQL syntax.
        - Use proper JOIN syntax for multiple tables.
        - Include WHERE clauses for filtering if appropriate.
        - Use appropriate aggregations (COUNT, SUM, AVG) when needed.
        - Optimize queries for efficiency where possible.
        - Return clear, human-readable explanations.
        - If the question cannot be answered with the given schema or is ambiguous, respond with: 
          { "error": "Cannot answer question due to missing information or ambiguity.", "sql": null, "explanation": null, "requiredTables": [] }
        - If the question is not related to database queries (like greetings), respond with:
          { "error": "This question is not related to database queries. Please ask about data in the database.", "sql": null, "explanation": null, "requiredTables": [] }
        `;

        // Using the modern SDK syntax
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });

        const textResponse = response.text;

        console.log("Raw text response from Gemini:", textResponse);

        let parsed;
        try {
            // Clean up the response - remove markdown, extra whitespace, and fix malformed JSON
            let cleanedResponse = textResponse
                .replace(/^```json\s*|```\s*$/g, '') // Remove markdown
                .replace(/^\s+|\s+$/g, '') // Trim whitespace
                .replace(/\n\s*\n/g, '\n') // Remove empty lines
                .replace(/}\s*{/g, '},{') // Fix malformed objects if they exist
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

            // If there are multiple JSON objects, take only the first valid one
            if (cleanedResponse.includes('}{')) {
                const firstBraceEnd = cleanedResponse.indexOf('}') + 1;
                cleanedResponse = cleanedResponse.substring(0, firstBraceEnd);
            }

            console.log("Cleaned response:", cleanedResponse);
            
            parsed = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Error parsing JSON response from Gemini:', parseError);
            console.error('Original text response was:', textResponse);
            
            // Return a structured error response instead of throwing
            return {
                error: "Failed to parse AI response. Please try rephrasing your question.",
                sql: null,
                explanation: null,
                requiredTables: []
            };
        }
        
        // Validate response format
        if (parsed.error) {
            console.warn('Gemini indicated an error in processing the request:', parsed.error);
            return parsed;
        }

        // Ensure all required fields are present and valid
        if (!parsed.sql || typeof parsed.explanation !== 'string' || !Array.isArray(parsed.requiredTables)) {
            console.error('Invalid response structure from Gemini:', parsed);
            return {
                error: "Invalid response format from AI model. Please try again.",
                sql: null,
                explanation: null,
                requiredTables: []
            };
        }
        
        return parsed;

    } catch (error) {
        console.error('Error in generateSQLResponse function:', error);
        
        // Return a structured error response instead of throwing
        return {
            error: `Failed to generate SQL response: ${error.message}`,
            sql: null,
            explanation: null,
            requiredTables: []
        };
    }
}

export { generateSQLResponse };