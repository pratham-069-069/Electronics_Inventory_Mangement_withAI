// chatbot.controller.js
import { translateText, detectLanguage } from '../utils/translation.js';
import {
    extractIntentAndEntities,
    getOpenAIResponse,
    handleGetCount,
    handleListItems,
    handleGetItemDetails,
    handleGetProductList,
    handleGetProductCount,
    handleGetProductNameOnly,
    handleGetSupplierCount,
    handleGetTotalSalesAmount,
    handleGetPurchaseOrderStatus
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
            reply = "Hello! How can I assist you today?";
        } else {
            console.log("⚙️ Attempting intent and entity extraction...");
            const extractedInfo = await extractIntentAndEntities(translatedMessage);

            const filtersArray = extractedInfo.filters || []; // Default to empty if null/undefined
            const selectFieldsArray = extractedInfo.select_fields || ['*']; // Default to all if null/undefined
            const itemId = (extractedInfo.item_id === "null" || extractedInfo.item_id === "") ? null : extractedInfo.item_id;


            if (extractedInfo.intent && extractedInfo.target_table) {
                console.log(`🎯 Intent: ${extractedInfo.intent}, Table: ${extractedInfo.target_table}`);
                switch (extractedInfo.intent) {
                    case 'get_count':
                        reply = await handleGetCount(extractedInfo.target_table, filtersArray);
                        break;
                    case 'list_items':
                        const productQueryParams = { // For specific product list handling
                            product_name: filtersArray.find(f => f.column === 'p.product_name' || f.column === 'product_name')?.value.replace(/%/g, ''),
                            min_price: parseFloat(filtersArray.find(f => (f.column === 'p.unit_price' || f.column === 'unit_price') && f.operator === '>=')?.value) || null,
                            max_price: parseFloat(filtersArray.find(f => (f.column === 'p.unit_price' || f.column === 'unit_price') && f.operator === '<=')?.value) || null,
                            product_category: filtersArray.find(f => f.column === 'pc.category_name' || f.column === 'category_name')?.value.replace(/%/g, '')
                         };

                        if (extractedInfo.target_table === 'products' && (productQueryParams.product_name || productQueryParams.min_price !== null || productQueryParams.max_price !== null || productQueryParams.product_category)) {
                             reply = await handleGetProductList(productQueryParams);
                        } else if (extractedInfo.target_table === 'products' && selectFieldsArray.includes('product_name') && selectFieldsArray.length === 1) {
                            reply = await handleGetProductNameOnly();
                        }
                        else {
                            reply = await handleListItems(
                                extractedInfo.target_table,
                                filtersArray,
                                selectFieldsArray,
                                extractedInfo.order_by || null,
                                10 // Default limit
                            );
                        }
                        break;
                    case 'get_item_details':
                        if (itemId) {
                            reply = await handleGetItemDetails(extractedInfo.target_table, itemId);
                        } else {
                            reply = `Please specify the ID of the ${extractedInfo.target_table.replace(/s$/, '').replace('_', ' ')} you want details for.`;
                        }
                        break;
                    case 'get_sum':
                        if (extractedInfo.target_table === 'sales' && (selectFieldsArray.includes('total_amount') || selectFieldsArray.includes('*'))) {
                            reply = await handleGetTotalSalesAmount(filtersArray);
                        } else {
                            reply = "I can only provide sums for specific fields like total sales amount.";
                        }
                        break;
                    default:
                        console.log(`🤔 Unhandled structured intent: ${extractedInfo.intent}`);
                        reply = await getOpenAIResponse(translatedMessage);
                        break;
                }
            }
            // Fallback for simple keyword-based intents
            else if (lowerCaseMsg.includes("count of total products") || lowerCaseMsg.includes("how many products are there")) {
                 reply = await handleGetProductCount();
            } else if (lowerCaseMsg.includes("only the names") || lowerCaseMsg.includes("list product names")) {
                 reply = await handleGetProductNameOnly();
            } else if (lowerCaseMsg.includes("how many suppliers") || lowerCaseMsg.includes("count suppliers")) {
                 reply = await handleGetSupplierCount();
            } else if (lowerCaseMsg.match(/status of purchase order (\d+)/) || lowerCaseMsg.match(/purchase order (\d+) status/)) {
                 const poIdMatch = lowerCaseMsg.match(/purchase order (\d+)/);
                 if (poIdMatch && poIdMatch[1]) {
                     reply = await handleGetPurchaseOrderStatus(poIdMatch[1]);
                 } else {
                     reply = "Please provide the ID of the purchase order you want the status for.";
                 }
            } else if (lowerCaseMsg.includes("total sales amount") || lowerCaseMsg.includes("sum of sales")) {
                reply = await handleGetTotalSalesAmount(); // Call without filters for overall total
            }
             else {
                console.log("🧠 No specific intent matched or extracted, using general knowledge AI...");
                reply = await getOpenAIResponse(translatedMessage);
            }
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