/**
 * Account Provider Defaults Type
 * 
 * Định nghĩa default values cho provider per account
 */
export type AccountProviderDefaults = {
    // Default values for provider input fields
    inputDefaults?: Record<string, any>;
    // Default values for context fields (optional, can override global context)
    contextDefaults?: Record<string, any>;
};

/**
 * Account Model
 * 
 * Định nghĩa model cho account, bao gồm list providers mà account có quyền access
 */
export type AccountModel = {
    // Email của account
    email: string;
    // Danh sách providers mà account này có quyền access
    providers: string[];
    // Default values cho từng provider
    providerDefaults: Record<string, AccountProviderDefaults>;
};
