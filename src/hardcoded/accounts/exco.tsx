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
                key: "909819c7cc31fa1c850373aa",
                amount: 5,
                playerId: "8389",
            },
            contextDefaults: {}
        }
    } as Record<string, AccountProviderDefaults>
};
