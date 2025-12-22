import type {
    ProviderField,
    ContextField,
    ResponseFieldMapping,
    ProviderPayloadBuilder,
    FieldGenerator
} from "../types";

/**
 * Shope Provider Configuration
 * 
 * Định nghĩa:
 * - fields: Provider input fields (amount, etc.)
 * - contextFields: Context fields hiển thị ở left panel
 * - responseFields: Field mappings cho balance, error message, etc.
 * - generateFields: Function để generate dynamic fields (betId, transactionId, etc.)
 */

// Shope field generator - Generate betId, transactionId theo format riêng của Shope
export const generateShopeFields: FieldGenerator = (input, context, vars) => {
    // Shope generate betId theo format: SHOPE_{merchantId}_{timestamp}
    const timestamp = Date.now();
    const betId = `SHOPE_${context.merchantId}_${timestamp}`;
    
    // TransactionId format: TXN_{customerId}_{timestamp}
    const transactionId = `TXN_${context.customerId}_${timestamp}`;
    
    // Reference format: REF_{region}_{timestamp}
    const reference = `REF_${context.region}_${timestamp}`;
    
    return {
        betId,
        transactionId,
        reference,
        timestamp: new Date().toISOString()
    };
};

// Shope Provider Input Fields
export const shopeFields: ProviderField[] = [
    { key: "amount", label: "Amount", required: true, type: "number", placeholder: "1000" }
    // Shope không có providerId field
];

// Shope Context Fields
export const shopeContextFields: ContextField[] = [
    { key: "url", label: "Url", required: true, placeholder: "https://api.shope.com" },
    { key: "merchantId", label: "Merchant Id", required: true, placeholder: "merchant123" },
    { key: "apiKey", label: "API Key", required: true, placeholder: "api_key_here" },
    { key: "customerId", label: "Customer Id", required: true, placeholder: "customer123" },
    { key: "region", label: "Region", required: true, placeholder: "US/EU/ASIA" },
    { key: "currencyId", label: "Currency", required: true, placeholder: "EUR" },
    { key: "gameId", label: "Game Id", required: false, placeholder: "optional" }
    // Shope không có: operatorId, secretKey, playerId, providerId, token, bonusTicketId
];

// Shope Response Field Mappings
export const shopeResponseFields: ResponseFieldMapping = {
    balance: "data.balance",         // Shope có balance trong data.balance
    errorMessage: "error.message",   // Shope có error message trong error.message
    errorCode: "error.code",         // Shope có error code trong error.code
    status: "data.status",           // Shope có status trong data.status
    transactionId: "data.id",       // Shope có transaction ID trong data.id
    amount: "data.amount"            // Shope có amount trong data.amount
};

