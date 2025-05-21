// chatbot.controller.js - NO DATABASE INTERACTIONS IN THIS FILE
// Only relies on openai.service.js for potential DB calls
// The translation and OpenAI calls remain the same.

import { translateText, detectLanguage } from '../utils/translation.js';
import {
    extractQueryParamsFromMessage,
    getOpenAIResponse,
    handleGetProductList,
    handleGetProductCount,
    handleGetProductNameOnly,
    handleGetSupplierCount
} from '../services/openai.service.js';

export const handleChat = async (req, res) => {
    const { userId, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    try {
        console.log(`📨 User (${userId || 'anonymous'}) Message:`, message);

        const userLanguage = await detectLanguage(message);
        console.log(`🗣️ Detected Language: ${userLanguage}`);

        const translatedMessage = userLanguage === 'en'
            ? message
            : await translateText(message, 'en');
        if (userLanguage !== 'en') {
            console.log(`🌐 Translated to English: ${translatedMessage}`);
        }

        let reply = "I'm not sure how to respond to that.";
        const lowerCaseMsg = translatedMessage.toLowerCase();

        if (lowerCaseMsg.match(/\b(hello|hi|hey|greetings)\b/)) {
            reply = "Hello! How can I assist you with inventory or product information today?";
        } else if (lowerCaseMsg.includes("count of total products") || lowerCaseMsg.includes("how many products are there")) {
            reply = await handleGetProductCount();
        } else if (lowerCaseMsg.includes("only the names") || lowerCaseMsg.includes("list product names")) {
            reply = await handleGetProductNameOnly();
         } else if (lowerCaseMsg.includes("how many suppliers") || lowerCaseMsg.includes("count suppliers")) {
            reply = await handleGetSupplierCount();
        }
        else if (
            lowerCaseMsg.includes("product details") ||
            lowerCaseMsg.includes("find product") ||
            lowerCaseMsg.includes("search for products") ||
            lowerCaseMsg.includes("show me products") ||
            lowerCaseMsg.includes("list products") ||
            lowerCaseMsg.includes("price") ||
            lowerCaseMsg.includes("category")
         ) {
            console.log("⚙️ Attempting parameter extraction for product search...");
            const queryParams = await extractQueryParamsFromMessage(translatedMessage);
            if (queryParams.product_name || queryParams.min_price !== null || queryParams.max_price !== null || queryParams.product_category) {
                 reply = await handleGetProductList(queryParams);
            } else {
                 console.log("⚠️ No specific parameters extracted, treating as potential general query.");
                 reply = await getOpenAIResponse(translatedMessage);
            }
        }
        else {
            console.log("🧠 No specific intent matched, using general knowledge AI...");
            reply = await getOpenAIResponse(translatedMessage);
        }

        if (userLanguage !== 'en') {
            reply = await translateText(reply, userLanguage);
            console.log(`🌐 Translated Reply to ${userLanguage}: ${reply}`);
        }

        console.log("💬 Bot Reply:", reply);
        res.json({ reply });

    } catch (error) {
        console.error("🚨 Chatbot Controller Error:", error);
        let errorReply = "Sorry, I encountered an error. Please try again later.";
         try {
            const userLanguage = await detectLanguage(message);
            if (userLanguage !== 'en') {
                 errorReply = await translateText(errorReply, userLanguage);
            }
         } catch (translateError) {
             console.error("🚨 Error translating error message:", translateError);
         }
        res.status(500).json({ error: errorReply });
    }
};