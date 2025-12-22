import type {
    ProviderField,
    ContextField,
    ResponseFieldMapping,
    FieldGenerator
} from "../types";

/**
 * Excommunicado Provider Configuration
 * 
 * Định nghĩa:
 * - fields: Provider input fields
 * - contextFields: Context fields hiển thị ở left panel
 * - responseFields: Field mappings cho balance, error message, etc.
 * - generateFields: Function để generate dynamic fields (transactionId, roundId, etc.)
 */

// Exco field generator - Generate transactionId và roundId
// roundId phải được giữ lại để credit sử dụng cùng roundId
export const generateExcoFields: FieldGenerator = (input, context, vars) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);

    // TransactionId có thể sinh tùy ý
    const transactionId = `exco_${timestamp}_${random}`;

    // RoundId: nếu đã có từ vars (từ debit step trước), dùng lại
    // Nếu chưa có, sinh mới
    const roundId = vars.roundId || `round_${timestamp}_${random}`;

    return {
        transactionId,
        roundId,
        timestamp: new Date().toISOString()
    };
};

// Exco Provider Input Fields
export const excoFields: ProviderField[] = [
    { key: "amount", label: "Amount", required: true, type: "number", placeholder: "5" },
    { key: "url", label: "Url", required: true, placeholder: "https://dev-games.bitville-api.com/exco/api" },
    { key: "key", label: "Key", required: true, placeholder: "909819c7cc31fa1c850373aa" },
    { key: "playerId", label: "Player ID", required: true, placeholder: "8389" },
];

// Exco Context Fields
export const excoContextFields: ContextField[] = [];

// Exco Response Field Mappings
// Response format: {"nativeId":"8389","token":"...","balance":26998167.77,"currency":"zar","brand":"bitville"}
export const excoResponseFields: ResponseFieldMapping = {
    balance: "balance",              // Balance ở root level
    errorMessage: "error.message",   // Error message field path (nếu có)
    errorCode: "error.code",         // Error code field path (nếu có)
    status: "status",                // Status field path (nếu có)
    transactionId: "transactionId",  // Transaction ID field path (nếu có)
    amount: "amount"                 // Amount field path (nếu có)
};

