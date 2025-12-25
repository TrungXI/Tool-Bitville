import type { AccountProviderDefaults } from "./types";

/**
 * Blacklagoon Provider Accounts Configuration
 * 
 * Định nghĩa:
 * - accounts: Danh sách email accounts có quyền access Blacklagoon provider
 * - defaults: Default values cho từng account (nếu khác nhau)
 */
export const BLACKLAGOON_ACCOUNTS = {
    // Danh sách accounts có quyền access Blacklagoon
    accounts: [
        "admin@example.com"
    ],

    // Default values cho từng account
    defaults: {
        "admin@example.com": {
            inputDefaults: {
                url: "https://dev-games.bitville-api.com/blacklagoon/api",
                token: "909819c7cc31fa1c850373aa",
                amount: 5,
                playerid: "8389",
                // wallet: "bitville",
                // operator: "bitville",
                // brand: "bitville",
                // secret_key: "secret-bitville",
                freespinId: "d6796dc87b71291d32bb16f5b024c5b1"
            },
            contextDefaults: {}
        }
    } as Record<string, AccountProviderDefaults>
};
