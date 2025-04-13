const axios = require('axios');

async function thmxCurrencyConvert(amount, currency = "USD") {
    try {
        const url = "https://api.exchangerate-api.com/v4/latest/USD";  // Using USD as the base currency
        const response = await axios.get(url);

        // Log the full API response to check available rates
        console.log("API Response Data:", response.data);

        // Get the exchange rate for the provided currency
        const rate = response.data.rates[currency];
        console.log(`Exchange rate for ${currency}:`, rate);  // Corrected to use template literals

        // If the rate is not found, throw an error
        if (!rate) {
            throw new Error(`Invalid currency code or no data for that currency: ${currency}`);
        }

        let convertedAmount;

        // If the currency is USD, no conversion is needed, return the amount as is
        if (currency === 'USD') {
            convertedAmount = amount;  // No conversion needed if USD
        } else {
            // Convert from foreign currency to USD (divide by exchange rate)
            convertedAmount = amount / rate;  // Corrected calculation (multiplying by rate)
        }

        console.log(`Converted Amount for ${amount} ${currency} to USD:`, convertedAmount); // Added proper log message
        return convertedAmount;

    } catch (error) {
        console.error(" Error fetching exchange rate:", error.message);
        return null;  // Return null if the conversion fails
    }
}

module.exports = { thmxCurrencyConvert };

// Example Usage: Call the function to test
// thmxCurrencyConvert(2000, "EUR").then(result => console.log("Converted Amount:", result));  // Expected result: EUR to USD
// thmxCurrencyConvert(2000, "LKR").then(result => console.log("Converted Amount:", result));  // Expected result: LKR to USD
// thmxCurrencyConvert(2000, "USD").then(result => console.log("Converted Amount:", result));  // Expected result: USD to USD (no change)
