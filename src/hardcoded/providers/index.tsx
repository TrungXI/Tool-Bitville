/**
 * Providers Index
 * 
 * Aggregate tất cả providers và export ProviderDef type
 */

import type { ProviderDef } from "./types";
import { stripeFields, stripeContextFields, stripeResponseFields, generateStripeFields } from "./stripe/config";
import { STRIPE_SUITE } from "./stripe/testcases";
import { shopeFields, shopeContextFields, shopeResponseFields, generateShopeFields } from "./shope/config";
import { SHOPE_SUITE } from "./shope/testcases";
import { excoFields, excoContextFields, excoResponseFields, generateExcoFields } from "./exco/config";
import { EXCO_SUITE } from "./exco/testcases";

/**
 * Global Provider Definitions
 */
export const PROVIDERS: Record<string, ProviderDef> = {
    stripe: {
        key: "stripe",
        label: "Stripe",
        fields: stripeFields,
        contextFields: stripeContextFields,
        responseFields: stripeResponseFields,
        generateFields: generateStripeFields
    },
    shope: {
        key: "shope",
        label: "Shope",
        fields: shopeFields,
        contextFields: shopeContextFields,
        responseFields: shopeResponseFields,
        generateFields: generateShopeFields
    },
    exco: {
        key: "exco",
        label: "Excommunicado",
        fields: excoFields,
        contextFields: excoContextFields,
        responseFields: excoResponseFields,
        generateFields: generateExcoFields
    }
};

/**
 * Export test suites
 */
export const TEST_SUITES = {
    stripe: STRIPE_SUITE,
    shope: SHOPE_SUITE,
    exco: EXCO_SUITE
};

// Re-export types
export type {
    ProviderDef,
    ProviderField,
    ContextField,
    ResponseFieldMapping,
    ProviderPayloadBuilder,
    FieldGenerator
} from "./types";

