import type { AccountProviderDefaults, AccountModel } from "./types";
import { STRIPE_ACCOUNTS } from "./stripe";
import { SHOPE_ACCOUNTS } from "./shope";
import { EXCO_ACCOUNTS } from "./exco";

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
    shope: SHOPE_ACCOUNTS,
    exco: EXCO_ACCOUNTS
};

/**
 * Build ACCOUNTS object từ provider accounts config
 * Reverse từ provider -> accounts sang account -> providers
 * Format: { "email@example.com": { providers: { "stripe": {...}, "shope": {...} } } }
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
 * Build Account Models
 * 
 * Tạo AccountModel cho mỗi account, bao gồm list providers
 */
function buildAccountModels(): Record<string, AccountModel> {
    const models: Record<string, AccountModel> = {};

    for (const [email, accountData] of Object.entries(ACCOUNTS)) {
        models[email] = {
            email,
            providers: Object.keys(accountData.providers),
            providerDefaults: accountData.providers
        };
    }

    return models;
}

/**
 * ACCOUNT_MODELS - Account models với list providers
 * Format: { "email@example.com": { email: "...", providers: ["stripe", "shope"], providerDefaults: {...} } }
 */
export const ACCOUNT_MODELS = buildAccountModels();

/**
 * Helper: Get AccountModel cho email
 */
export function getAccountModel(email: string): AccountModel | undefined {
    return ACCOUNT_MODELS[email];
}
