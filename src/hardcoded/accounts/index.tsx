import type { AccountProviderDefaults } from "./types";
import { STRIPE_ACCOUNTS } from "./stripe";
import { SHOPE_ACCOUNTS } from "./shope";

/**
 * Provider Accounts Configuration
 * 
 * Mỗi provider có file riêng định nghĩa:
 * - accounts: Danh sách email accounts có quyền
 * - defaults: Default values cho từng account
 */

// Map provider -> accounts config
const PROVIDER_ACCOUNTS: Record<string, {
    accounts: string[];
    defaults: Record<string, AccountProviderDefaults>;
}> = {
    stripe: STRIPE_ACCOUNTS,
    shope: SHOPE_ACCOUNTS
};

/**
 * Build ACCOUNTS object từ provider accounts config
 * Reverse từ provider -> accounts sang account -> providers
 */
function buildAccountsObject(): Record<string, { providers: Record<string, AccountProviderDefaults> }> {
    const accountsMap: Record<string, { providers: Record<string, AccountProviderDefaults> }> = {};

    // Iterate qua từng provider
    for (const [providerKey, providerConfig] of Object.entries(PROVIDER_ACCOUNTS)) {
        // Iterate qua từng account trong provider
        for (const accountEmail of providerConfig.accounts) {
            // Initialize account nếu chưa có
            if (!accountsMap[accountEmail]) {
                accountsMap[accountEmail] = { providers: {} };
            }

            // Add provider với defaults cho account này
            accountsMap[accountEmail].providers[providerKey] = 
                providerConfig.defaults[accountEmail] || {};
        }
    }

    return accountsMap;
}

/**
 * ACCOUNTS object - tương thích với code cũ
 * Format: { "email@example.com": { providers: { "stripe": {...}, "shope": {...} } } }
 */
export const ACCOUNTS = buildAccountsObject();

/**
 * Helper: Check account có quyền access provider không
 */
export function hasProviderAccess(email: string, provider: string): boolean {
    const providerConfig = PROVIDER_ACCOUNTS[provider];
    if (!providerConfig) return false;
    return providerConfig.accounts.includes(email);
}

/**
 * Helper: Get list accounts có quyền access provider
 */
export function getAccountsForProvider(provider: string): string[] {
    const providerConfig = PROVIDER_ACCOUNTS[provider];
    return providerConfig?.accounts || [];
}

/**
 * Helper: Get default values cho account + provider
 */
export function getAccountProviderDefaults(email: string, provider: string): AccountProviderDefaults | undefined {
    const providerConfig = PROVIDER_ACCOUNTS[provider];
    if (!providerConfig) return undefined;
    return providerConfig.defaults[email];
}

/**
 * Helper: Get all providers cho account
 */
export function getProvidersForAccount(email: string): string[] {
    const account = ACCOUNTS[email];
    return account ? Object.keys(account.providers) : [];
}

