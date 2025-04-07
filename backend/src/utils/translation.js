import { translate } from '@vitalets/google-translate-api';

// Function to Translate Text
export const translateText = async (text, targetLanguage) => {
    try {
        const res = await translate(text, { to: targetLanguage });
        return res.text;
    } catch (error) {
        console.error("🚨 Translation Error:", error);
        // Return original text on error, maybe log or handle differently
        return text;
    }
};

// Detect Language
export const detectLanguage = async (text) => {
    try {
        // Basic check to avoid API call for empty strings
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            console.warn("⚠️ Language detection skipped for empty input.");
            return 'en'; // Default to English or handle as needed
        }
        // Use a minimal text snippet if text is very long to save resources/time
        const snippet = text.length > 100 ? text.substring(0, 100) : text;
        const res = await translate(snippet, { to: 'en' }); // Detect by translating a snippet to English
        return res?.from?.language?.iso || 'en'; // Default to 'en' if detection fails
    } catch (error) {
        console.error("🚨 Language Detection Error:", error);
        return 'en'; // Default to English on error
    }
};