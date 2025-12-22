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
                amount: 5,
                game: "vegascaline",
                nativeId: "8389",
                category: "normal",
                name: "main",
                ip: "14.186.133.103"
            },
            contextDefaults: {
                url: "https://dev-games.bitville-api.com/exco/api",
                playerId: "cd8fb235-9156-45ab-9615-0eb922cd069d",
                apiKey: "api_key_exco_admin"
            }
        }
    } as Record<string, AccountProviderDefaults>
};
