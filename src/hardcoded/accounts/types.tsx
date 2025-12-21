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

