export type ProviderField = {
    key: string;
    label: string;
    required: boolean;
    placeholder?: string;
    type?: "text" | "number" | "json";
};

export type ContextField = {
    key: string;
    label: string;
    required: boolean;
    placeholder?: string;
    type?: "text" | "number" | "json";
};

export type ProviderPayloadBuilder = (input: Record<string, any>, context: Record<string, any>) => any;

/**
 * Field Generator - Generate dynamic fields (betId, transactionId, reference, etc.) before API call
 * Mỗi provider có thể có cách generate fields riêng
 */
export type FieldGenerator = (
    input: Record<string, any>,      // Provider input fields
    context: Record<string, any>,    // Context fields
    vars: Record<string, any>       // Extracted variables from previous steps
) => Record<string, any>;

export type ResponseFieldMapping = {
    // Field path for balance in response (e.g., "balance", "data.balance", "result.balance")
    balance?: string;
    // Field path for error message (e.g., "message", "error.message", "errMsg")
    errorMessage?: string;
    // Field path for error code (e.g., "err", "error.code", "errorCode")
    errorCode?: string;
    // Field path for status field (e.g., "status", "result.status")
    status?: string;
    // Field path for transaction ID (e.g., "id", "transactionId", "data.id")
    transactionId?: string;
    // Field path for amount in response (e.g., "amount", "data.amount")
    amount?: string;
};

export type ProviderDef = {
    key: string;
    label: string;
    // Provider-specific input fields
    fields: ProviderField[];
    // Context fields configuration per provider
    contextFields: ContextField[];
    // Response field mappings - define which fields in response represent balance, message, error code, etc.
    responseFields?: ResponseFieldMapping;
    // Function to build payload according to provider's specific model
    buildPayload?: ProviderPayloadBuilder;
    // Field generator - Generate dynamic fields (betId, transactionId, reference) before API call
    generateFields?: FieldGenerator;
};

// Stripe field generator - Generate betId, transactionId, reference
const generateStripeFields: FieldGenerator = (input, context, vars) => {
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

// Stripe payload builder - có providerId trong payload
const buildStripePayload: ProviderPayloadBuilder = (input, context) => {
    return {
        provider: "stripe",
        operatorId: context.operatorId,
        providerId: context.providerId, // Stripe có providerId
        playerId: context.playerId,
        amount: input.amount,
        currencyId: context.currencyId,
        gameId: context.gameId,
        ...(context.bonusTicketId ? { bonusTicketId: context.bonusTicketId } : {}),
        meta: {
            timestamp: new Date().toISOString()
        }
    };
};

// Shope field generator - Generate betId, transactionId theo format riêng của Shope
const generateShopeFields: FieldGenerator = (input, context, vars) => {
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

// Shope payload builder - sử dụng các context fields riêng của Shope
const buildShopePayload: ProviderPayloadBuilder = (input, context) => {
    return {
        provider: "shope",
        merchantId: context.merchantId,
        apiKey: context.apiKey,
        customerId: context.customerId,
        region: context.region,
        amount: input.amount,
        currencyId: context.currencyId,
        ...(context.gameId ? { gameId: context.gameId } : {}),
        meta: {
            timestamp: new Date().toISOString()
        }
    };
};

// Global provider definitions
// Mỗi provider có thể có context fields hoàn toàn khác nhau
export const PROVIDERS: Record<string, ProviderDef> = {
    stripe: {
        key: "stripe",
        label: "Stripe",
        fields: [
            { key: "amount", label: "Amount", required: true, type: "number", placeholder: "1000" },
            { key: "providerId", label: "Provider ID", required: true, placeholder: "provider123" }
        ],
        // Stripe có các context fields: Operator Id, Secret Key, Player Id, Currency, etc.
        contextFields: [
            { key: "url", label: "Url", required: true, placeholder: "https://api.stripe.com" },
            { key: "operatorId", label: "Operator Id", required: true, placeholder: "operator123" },
            { key: "secretKey", label: "Secret Key", required: true, placeholder: "sk_test_..." },
            { key: "playerId", label: "Player Id", required: true, placeholder: "player123" },
            { key: "currencyId", label: "Currency", required: true, placeholder: "USD" },
            { key: "gameId", label: "Game Id", required: true, placeholder: "game123" },
            { key: "token", label: "Token", required: false, placeholder: "optional token" },
            { key: "providerId", label: "Provider Id", required: true, placeholder: "provider123" },
            { key: "bonusTicketId", label: "Bonus Ticket Id", required: false, placeholder: "optional" }
        ],
        // Response field mappings for Stripe
        responseFields: {
            balance: "balance",              // Balance field path
            errorMessage: "message",         // Error message field path
            errorCode: "err",                // Error code field path
            status: "status",                 // Status field path
            transactionId: "id",              // Transaction ID field path
            amount: "amount"                  // Amount field path
        },
        buildPayload: buildStripePayload,
        generateFields: generateStripeFields
    },

    shope: {
        key: "shope",
        label: "Shope",
        fields: [
            { key: "amount", label: "Amount", required: true, type: "number", placeholder: "1000" }
            // Shope không có providerId field
        ],
        // Shope có các context fields khác: Merchant Id, API Key, Customer Id, Region (không có Operator Id, Secret Key như Stripe)
        contextFields: [
            { key: "url", label: "Url", required: true, placeholder: "https://api.shope.com" },
            { key: "merchantId", label: "Merchant Id", required: true, placeholder: "merchant123" },
            { key: "apiKey", label: "API Key", required: true, placeholder: "api_key_here" },
            { key: "customerId", label: "Customer Id", required: true, placeholder: "customer123" },
            { key: "region", label: "Region", required: true, placeholder: "US/EU/ASIA" },
            { key: "currencyId", label: "Currency", required: true, placeholder: "EUR" },
            { key: "gameId", label: "Game Id", required: false, placeholder: "optional" }
            // Shope không có: operatorId, secretKey, playerId, providerId, token, bonusTicketId
        ],
        // Response field mappings for Shope (có thể khác với Stripe)
        responseFields: {
            balance: "data.balance",         // Shope có balance trong data.balance
            errorMessage: "error.message",   // Shope có error message trong error.message
            errorCode: "error.code",         // Shope có error code trong error.code
            status: "data.status",           // Shope có status trong data.status
            transactionId: "data.id",       // Shope có transaction ID trong data.id
            amount: "data.amount"            // Shope có amount trong data.amount
        },
        buildPayload: buildShopePayload,
        generateFields: generateShopeFields
    }
};
