/**
 * Providers Index
 * 
 * Aggregate tất cả providers và export ProviderDef type
 */

import type { ProviderDef } from "./types";
import { blacklagoonFields, blacklagoonContextFields, blacklagoonResponseFields, generateBlacklagoonFields } from "./blacklagoon/config";
import { BLACKLAGOON_SUITE } from "./blacklagoon/testcases";
import { excoFields, excoContextFields, excoResponseFields, generateExcoFields } from "./exco/config";
import { EXCO_SUITE } from "./exco/testcases";

/**
 * Global Provider Definitions
 */
export const PROVIDERS: Record<string, ProviderDef> = {
    exco: {
        key: "exco",
        label: "Excommunicado",
        fields: excoFields,
        contextFields: excoContextFields,
        responseFields: excoResponseFields,
        generateFields: generateExcoFields
    },
    blacklagoon: {
        key: "blacklagoon",
        label: "Blacklagoon",
        fields: blacklagoonFields,
        contextFields: blacklagoonContextFields,
        responseFields: blacklagoonResponseFields,
        generateFields: generateExcoFields
    }
};

/**
 * Export test suites
 */
export const TEST_SUITES = {
    exco: EXCO_SUITE,
    blacklagoon: BLACKLAGOON_SUITE
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

