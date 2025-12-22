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
    { key: "amount", label: "Amount", required: true, type: "number", placeholder: "100" },
    { key: "game", label: "Game", required: true, placeholder: "vegascaline" },
    { key: "nativeId", label: "Native ID", required: true, placeholder: "8389" },
    { key: "category", label: "Category", required: true, placeholder: "normal" },
    { key: "name", label: "Name", required: true, placeholder: "main" },
    { key: "ip", label: "IP Address", required: true, placeholder: "14.186.133.103" }
];

// Exco Context Fields
export const excoContextFields: ContextField[] = [
    { key: "url", label: "Url", required: true, placeholder: "https://api.excommunicado.com" },
    { key: "playerId", label: "Player Id", required: true, placeholder: "cd8fb235-9156-45ab-9615-0eb922cd069d" },
    { key: "apiKey", label: "API Key", required: false, placeholder: "optional" }
];

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

