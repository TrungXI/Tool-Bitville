export type ProviderField = {
    key: string;
    label: string;
    required: boolean;
    placeholder?: string;
    type?: "text" | "number" | "json";
};

export type ProviderDef = {
    key: string;
    label: string;
    // field user phải nhập khi test
    fields: ProviderField[];

    // mapping để build standard payload + auth headers từ account config
    standardMap: {
        authType: "bearer" | "x-header";
        authField: string;            // field lấy trong account.providerConfig
        authHeaderName?: string;      // khi authType = x-header
    };

    defaultHeaders?: Record<string, string>;
};

// Global provider definitions (schema + mapping)
export const PROVIDERS: Record<string, ProviderDef> = {
    stripe: {
        key: "stripe",
        label: "Stripe",
        fields: [
            { key: "customerId", label: "Customer ID", required: true, placeholder: "cus_..." },
            { key: "amount", label: "Amount", required: true, type: "number", placeholder: "1000" },
            { key: "note", label: "Note", required: false, placeholder: "optional note" }
        ],
        standardMap: {
            authType: "bearer",
            authField: "apiKey"
        },
        defaultHeaders: { "Content-Type": "application/json" }
    },

    shopify: {
        key: "shopify",
        label: "Shopify",
        fields: [
            { key: "orderId", label: "Order ID", required: true, placeholder: "123456" },
            { key: "includeItems", label: "Include Items", required: false, placeholder: "true/false" }
        ],
        standardMap: {
            authType: "x-header",
            authField: "token",
            authHeaderName: "X-Shopify-Access-Token"
        },
        defaultHeaders: { "Content-Type": "application/json" }
    }
};