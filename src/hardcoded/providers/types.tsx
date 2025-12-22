/**
 * Global Provider Types
 * 
 * Types chung cho tất cả providers
 */

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
    // Field generator - Generate dynamic fields (betId, transactionId, reference) before API call
    generateFields?: FieldGenerator;
};

