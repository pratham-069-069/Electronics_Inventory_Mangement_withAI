import { translateText, detectLanguage } from '../utils/translation.js';
import {
    extractQueryParamsFromMessage,
    getOpenAIResponse,
    handleGetProductList,
    handleGetProductCount,
    handleGetProductNameOnly,
    handleGetSupplierCount
} from '../services/openai.service.js'; // Assuming all handlers are in openai.service

// Store Chat History (In-memory, simple example - Replace with DB/Redis for production)
// const chatHistory = {}; // If needed for context, manage carefully

export const handleChat = async (req, res) => {
    const { userId, message } = req.body; // Assuming userId might be used later

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    try {
        console.log(`📨 User (${userId || 'anonymous'}) Message:`, message);

        // 1. Detect Language
        const userLanguage = await detectLanguage(message);
        console.log(`🗣️ Detected Language: ${userLanguage}`);

        // 2. Translate to English if necessary for processing
        const translatedMessage = userLanguage === 'en'
            ? message
            : await translateText(message, 'en');
        if (userLanguage !== 'en') {
            console.log(`🌐 Translated to English: ${translatedMessage}`);
        }

        let reply = "I'm not sure how to respond to that."; // Default reply

        // 3. Intent Recognition & Handling (Simple Keyword/Regex Based)
        // Prioritize more specific intents first
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
         // More complex intent: searching products (potentially with filters)
        else if (
            lowerCaseMsg.includes("product details") ||
            lowerCaseMsg.includes("find product") ||
            lowerCaseMsg.includes("search for products") ||
            lowerCaseMsg.includes("show me products") ||
            lowerCaseMsg.includes("list products") ||
            lowerCaseMsg.includes("price") || // Trigger extraction if price mentioned
            lowerCaseMsg.includes("category") // Trigger extraction if category mentioned
         ) {
            console.log("⚙️ Attempting parameter extraction for product search...");
            const queryParams = await extractQueryParamsFromMessage(translatedMessage);
            // Check if any useful params were extracted or if it's a generic request
            if (queryParams.product_name || queryParams.min_price !== null || queryParams.max_price !== null || queryParams.product_category) {
                 reply = await handleGetProductList(queryParams);
            } else {
                // If no specific params extracted, maybe ask clarifying questions or do a generic list
                // For now, let's assume it might be general knowledge if extraction fails badly
                 console.log("⚠️ No specific parameters extracted, treating as potential general query.");
                 reply = await getOpenAIResponse(translatedMessage); // Fallback to general AI
            }
        }
        // Add more intents here (e.g., specific product stock check, supplier details)
        // else if (lowerCaseMsg.includes("stock for product")) { ... }

        else {
            // 4. Fallback to General Knowledge AI
            console.log("🧠 No specific intent matched, using general knowledge AI...");
            reply = await getOpenAIResponse(translatedMessage);
        }

        // 5. Translate Reply back to User's Language if necessary
        if (userLanguage !== 'en') {
            reply = await translateText(reply, userLanguage);
            console.log(`🌐 Translated Reply to ${userLanguage}: ${reply}`);
        }

        console.log("💬 Bot Reply:", reply);
        res.json({ reply });

    } catch (error) {
        console.error("🚨 Chatbot Controller Error:", error);
        // Send a user-friendly error in the original language if possible
        let errorReply = "Sorry, I encountered an error. Please try again later.";
         try {
            const userLanguage = await detectLanguage(message); // Redetect if needed
            if (userLanguage !== 'en') {
                 errorReply = await translateText(errorReply, userLanguage);
            }
         } catch (translateError) {
             console.error("🚨 Error translating error message:", translateError);
         }
        res.status(500).json({ error: errorReply });
    }
};