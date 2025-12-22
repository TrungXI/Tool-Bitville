import type {
    ProviderField,
    ContextField,
    ResponseFieldMapping,
    ProviderPayloadBuilder,
    FieldGenerator
} from "../types";

/**
 * Stripe Provider Configuration
 * 
 * Định nghĩa:
 * - fields: Provider input fields (amount, providerId, etc.)
 * - contextFields: Context fields hiển thị ở left panel
 * - responseFields: Field mappings cho balance, error message, etc.
 * - generateFields: Function để generate dynamic fields (betId, transactionId, etc.)
 */

// Stripe field generator - Generate betId, transactionId, reference
export const generateStripeFields: FieldGenerator = (input, context, vars) => {
    // Stripe generate betId theo format: bet_stripe_{timestamp}_{random}
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const betId = `bet_stripe_${timestamp}_${random}`;
    
    // TransactionId format: tx_stripe_{timestamp}
    const transactionId = `tx_stripe_${timestamp}`;
    
    // Reference format: ref_{playerId}_{timestamp}
    const reference = `ref_${context.playerId}_${timestamp}`;
    
    return {
        betId,
        transactionId,
        reference,
        // Có thể generate thêm các fields khác
        timestamp: new Date().toISOString()
    };
};

// Stripe Provider Input Fields
export const stripeFields: ProviderField[] = [
    { key: "amount", label: "Amount", required: true, type: "number", placeholder: "1000" },
    { key: "providerId", label: "Provider ID", required: true, placeholder: "provider123" }
];

// Stripe Context Fields
export const stripeContextFields: ContextField[] = [
    { key: "url", label: "Url", required: true, placeholder: "https://api.stripe.com" },
    { key: "operatorId", label: "Operator Id", required: true, placeholder: "operator123" },
    { key: "secretKey", label: "Secret Key", required: true, placeholder: "sk_test_..." },
    { key: "playerId", label: "Player Id", required: true, placeholder: "player123" },
    { key: "currencyId", label: "Currency", required: true, placeholder: "USD" },
    { key: "gameId", label: "Game Id", required: true, placeholder: "game123" },
    { key: "token", label: "Token", required: false, placeholder: "optional token" },
    { key: "providerId", label: "Provider Id", required: true, placeholder: "provider123" },
    { key: "bonusTicketId", label: "Bonus Ticket Id", required: false, placeholder: "optional" }
];

// Stripe Response Field Mappings
export const stripeResponseFields: ResponseFieldMapping = {
    balance: "balance",              // Balance field path
    errorMessage: "message",         // Error message field path
    errorCode: "err",                // Error code field path
    status: "status",                 // Status field path
    transactionId: "id",              // Transaction ID field path
    amount: "amount"                  // Amount field path
};

