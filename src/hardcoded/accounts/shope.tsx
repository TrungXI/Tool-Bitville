import type { AccountProviderDefaults } from "./types";

/**
 * Shope Provider Accounts Configuration
 * 
 * Định nghĩa:
 * - accounts: Danh sách email accounts có quyền access Shope provider
 * - defaults: Default values cho từng account (nếu khác nhau)
 */
export const SHOPE_ACCOUNTS = {
    // Danh sách accounts có quyền access Shope
    accounts: [
        "admin@example.com"
    ],
    
    // Default values cho từng account
    defaults: {
        "admin@example.com": {
            inputDefaults: {
                amount: 2000
            },
            contextDefaults: {
                url: "https://api.shope.example.com",
                merchantId: "merchant_shope_001",
                apiKey: "api_key_shope_admin",
                customerId: "customer_shope_001",
                region: "EU",
                currencyId: "EUR",
                gameId: "game_shope_001"
            }
        }
    } as Record<string, AccountProviderDefaults>
};

