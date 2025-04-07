// Format Database Results Readably
export const formatDatabaseResult = (result, selectOnlyName = false) => {
    if (!result || !result.rows || result.rows.length === 0) {
        return "No data found matching your criteria.";
    }

    let response = "📊 **Database Result:**\n\n"; // Add spacing

    result.rows.forEach((row, index) => {
        response += `*Entry ${index + 1}:*\n`; // Use markdown for emphasis
        if (selectOnlyName && row.product_name !== undefined) { // Check if product_name exists
            response += `  • Product Name: ${row.product_name}\n`;
        } else {
            Object.entries(row).forEach(([key, value]) => {
                // Format keys for better readability
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                response += `  • ${formattedKey}: ${value}\n`;
            });
        }
        response += "\n"; // Add space between entries
    });

    return response;
};