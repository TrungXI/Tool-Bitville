import { STRIPE_SUITE } from "./stripe";
import { SHOPE_SUITE } from "./shope";
import type { ProviderSuite } from "./_types";

export const TEST_SUITES: Record<string, ProviderSuite> = {
    stripe: STRIPE_SUITE,
    shope: SHOPE_SUITE
};

export type { ProviderSuite, TestCaseDef, StepDef, AssertRule, ExtractRule, HttpMethod } from "./_types";

