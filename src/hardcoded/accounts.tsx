/**
 * Account Types and Models
 * Re-export từ accounts/types.ts
 */
export type { AccountProviderDefaults, AccountModel } from "./accounts/types";

// Re-export từ accounts/index.ts để tương thích với code cũ
export { 
    ACCOUNTS,
    ACCOUNT_MODELS,
    getAccountModel
} from "./accounts/index";
