export const ACCOUNTS: Record<
    string,
    {
        providers: Record<string, any>; // provider config per account (secrets)
    }
> = {
    "admin@example.com": {
        providers: {
            stripe: {
                apiKey: "sk_test_admin_001"
            },
            shopify: {
                token: "shpat_admin_001"
            }
        }
    },

    // ví dụ: user khác chỉ có stripe
    "user1@example.com": {
        providers: {
            stripe: { apiKey: "sk_test_user1_001" }
        }
    }
};