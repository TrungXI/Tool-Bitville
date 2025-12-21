import type { AccountProviderDefaults } from "./types";

/**
 * Stripe Provider Accounts Configuration
 * 
 * Định nghĩa:
 * - accounts: Danh sách email accounts có quyền access Stripe provider
 * - defaults: Default values cho từng account (nếu khác nhau)
 */
export const STRIPE_ACCOUNTS = {
    // Danh sách accounts có quyền access Stripe
    accounts: [
        "admin@example.com",
        "user1@example.com"
    ],
    
    // Default values cho từng account
    defaults: {
        "admin@example.com": {
            inputDefaults: {
                amount: 1,
                providerId: "stripe_provider_001"
            },
            contextDefaults: {
                url: "https://api.stripe.example.com",
                operatorId: "operator_stripe_001",
                secretKey: "sk_test_stripe_admin",
                token: "token_stripe_admin",
                providerId: "stripe_provider_001",
                playerId: "player_stripe_001",
                currencyId: "USD",
                gameId: "game_stripe_001"
            }
        },
        "user1@example.com": {
            inputDefaults: {
                amount: 500,
                providerId: "stripe_provider_user1"
            },
            contextDefaults: {}
        }
    } as Record<string, AccountProviderDefaults>
};

