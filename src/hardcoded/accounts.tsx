/**
 * Account Provider Defaults Type
 * Re-export từ accounts/types.ts
 */
export type { AccountProviderDefaults } from "./accounts/types";

// Re-export từ accounts/index.ts để tương thích với code cũ
export { 
    ACCOUNTS, 
    hasProviderAccess, 
    getAccountsForProvider, 
    getAccountProviderDefaults,
    getProvidersForAccount 
} from "./accounts/index";
