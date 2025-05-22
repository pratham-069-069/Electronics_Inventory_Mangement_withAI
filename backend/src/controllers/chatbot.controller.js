// chatbot.controller.js
import { translateText, detectLanguage } from '../utils/translation.js';
import { generateSQLResponse } from '../services/gemini.service.js';
import pool from '../config/db.js';

export const handleChat = async (req, res) => {
    const { userId, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    let userLanguage = 'en'; // Default to English

    try {
        console.log(`📨 User (${userId || 'anonymous'}) Message:`, message);

        // Detect language and translate if needed
        userLanguage = await detectLanguage(message);
        const translatedMessage = userLanguage === 'en' ? message : await translateText(message, 'en');
        
        // Generate SQL response using Gemini
        const geminiResponse = await generateSQLResponse(translatedMessage);
        
        // Check if Gemini returned an error
        if (geminiResponse.error) {
            console.log('Gemini returned an error:', geminiResponse.error);
            
            let errorMessage = geminiResponse.error;
            
            // Translate error message if needed
            if (userLanguage !== 'en') {
                try {
                    errorMessage = await translateText(errorMessage, userLanguage);
                } catch (translateError) {
                    console.error('Error translating error message:', translateError);
                }
            }
            
            return res.status(400).json({ 
                error: errorMessage,
                sql: null,
                tables: []
            });
        }
        
        // If we have a valid SQL query, execute it
        if (geminiResponse.sql) {
            try {
                // Execute the generated SQL query
                const [results] = await pool.query(geminiResponse.sql);
                
                // Format the response - create a clean, user-friendly answer
                let cleanAnswer;
                
                if (results.length === 0) {
                    cleanAnswer = "No data found for your query.";
                } else if (results.length === 1 && Object.keys(results[0]).length === 1) {
                    // Single result with single field - return just the value
                    const value = Object.values(results[0])[0];
                    cleanAnswer = value !== null ? String(value) : "No data available";
                } else if (results.length === 1) {
                    // Single result with multiple fields - format as readable text
                    const result = results[0];
                    cleanAnswer = Object.entries(result)
                        .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
                        .join(', ');
                } else {
                    // Multiple results - format as a simple list
                    cleanAnswer = results.map((result, index) => {
                        if (Object.keys(result).length === 1) {
                            return `${index + 1}. ${Object.values(result)[0]}`;
                        } else {
                            return `${index + 1}. ${Object.entries(result)
                                .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
                                .join(', ')}`;
                        }
                    }).join('\n');
                }

                let reply = {
                    answer: cleanAnswer,
                    sql: geminiResponse.sql,
                    tables: geminiResponse.requiredTables
                };

                // Translate back if needed
                if (userLanguage !== 'en') {
                    try {
                        reply.answer = await translateText(reply.answer, userLanguage);
                    } catch (translateError) {
                        console.error('Error translating response:', translateError);
                        // Continue with English response if translation fails
                    }
                }
                
                return res.json(reply);
                
            } catch (sqlExecutionError) {
                console.error('Error executing SQL query:', sqlExecutionError);
                
                let errorMessage = `Error executing query: ${sqlExecutionError.message}`;
                
                // Translate error message if needed
                if (userLanguage !== 'en') {
                    try {
                        errorMessage = await translateText(errorMessage, userLanguage);
                    } catch (translateError) {
                        console.error('Error translating SQL error message:', translateError);
                    }
                }
                
                return res.status(400).json({ 
                    error: errorMessage,
                    sql: geminiResponse.sql,
                    tables: geminiResponse.requiredTables
                });
            }
        } else {
            // This shouldn't happen if our error handling above works correctly
            return res.status(400).json({ 
                error: 'No valid SQL query was generated.',
                sql: null,
                tables: []
            });
        }
            
    } catch (error) {
        console.error('Error in chat handling:', error);
        let errorMessage = 'Internal server error. Please try again.';
        
        // Try to translate error message if we know the user's language
        if (userLanguage && userLanguage !== 'en') {
            try {
                errorMessage = await translateText(errorMessage, userLanguage);
            } catch (translateError) {
                console.error('Error translating error message:', translateError);
            }
        }
        
        return res.status(500).json({ error: errorMessage });
    }
};