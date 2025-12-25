import type {
    ProviderField,
    ContextField,
    ResponseFieldMapping,
    FieldGenerator
} from "../types";

/**
 * Blacklagoon Provider Configuration
 * 
 * Định nghĩa:
 * - fields: Provider input fields
 * - contextFields: Context fields hiển thị ở left panel
 * - responseFields: Field mappings cho balance, error message, etc.
 * - generateFields: Function để generate dynamic fields (transactionId, roundId, etc.)
 */

// Blacklagoon field generator - Generate transactionId và roundId
// roundId phải được giữ lại để credit sử dụng cùng roundId
export const generateBlacklagoonFields: FieldGenerator = (input, context, vars) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);

    // TransactionId có thể sinh tùy ý
    const transactionId = `blacklagoon_${timestamp}_${random}`;

    // RoundId: nếu đã có từ vars (từ debit step trước), dùng lại
    // Nếu chưa có, sinh mới
    const roundId = vars.roundId || `round_${timestamp}_${random}`;
    const freespinId = input.freespinId || `freespin_${timestamp}_${random}`;
    return {
        freespinId,
        transactionId,
        roundId,
        timestamp: new Date().toISOString()
    };
};

// Blacklagoon Provider Input Fields
export const blacklagoonFields: ProviderField[] = [
    { key: "amount", label: "Amount", required: true, type: "number", placeholder: "5" },
    { key: "url", label: "Url", required: true, placeholder: "https://dev-games.bitville-api.com/blacklagoon/api" },
    // { key: "token", label: "Token", required: true, placeholder: "909819c7cc31fa1c850373aa" },
    { key: "playerid", label: "Player ID", required: true, placeholder: "8389" },
    { key: "freespinId", label: "Free Spin ID", required: false, placeholder: "" },
    // { key: "wallet", label: "Wallet", required: false, placeholder: "bitville" },
    // { key: "operator", label: "Operator", required: false, placeholder: "bitville" },
    // { key: "brand", label: "Brand", required: false, placeholder: "bitville" },
    { key: "secret_key", label: "Secret Key", required: false, placeholder: "secret-bitville" },
];

// Blacklagoon Context Fields
export const blacklagoonContextFields: ContextField[] = [];

// Blacklagoon Response Field Mappings
// Response format: {"nativeId":"8389","token":"...","balance":26998167.77,"currency":"zar","brand":"bitville"}
export const blacklagoonResponseFields: ResponseFieldMapping = {
    balance: "balance",              // Balance ở root level
    errorMessage: "error.message",   // Error message field path (nếu có)
    errorCode: "error.code",         // Error code field path (nếu có)
    status: "status",                // Status field path (nếu có)
    transactionId: "transactionId",  // Transaction ID field path (nếu có)
    amount: "amount"                 // Amount field path (nếu có)
};

