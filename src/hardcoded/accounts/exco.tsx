import type { AccountProviderDefaults } from "./types";

/**
 * Excommunicado Provider Accounts Configuration
 * 
 * Định nghĩa:
 * - accounts: Danh sách email accounts có quyền access Exco provider
 * - defaults: Default values cho từng account (nếu khác nhau)
 */
export const EXCO_ACCOUNTS = {
    // Danh sách accounts có quyền access Exco
    accounts: [
        "admin@example.com"
    ],

    // Default values cho từng account
    defaults: {
        "admin@example.com": {
            inputDefaults: {
                url: "https://dev-games.bitville-api.com/exco/api",
                token: "909819c7cc31fa1c850373aa",
                amount: 5,
                playerId: "8389",
                wallet: "bitville",
                operator: "bitville",
                brand: "bitville",
                secret_key: "secret-bitville",
                freespinId: "d6796dc87b71291d32bb16f5b024c5b1"
            },
            contextDefaults: {}
        }
    } as Record<string, AccountProviderDefaults>
};
