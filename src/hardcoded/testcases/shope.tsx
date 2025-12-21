import type { ProviderSuite } from "./_types";

export const SHOPE_SUITE: ProviderSuite = {
    provider: "shope",
    title: "Shope Test Suite",
    cases: [
        {
            id: "auth_valid",
            title: "Authenticate With Valid Parameters",
            expected: "Authenticate success",
            steps: [
                {
                    id: "authenticate",
                    title: "Authenticate",
                    method: "POST",
                    url: "{{context.url}}/authenticate",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    body: { merchantId: "{{context.merchantId}}", customerId: "{{context.customerId}}" },
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_in", path: "err", expected: [0, 1] }
                    ]
                }
            ]
        },
        {
            id: "cancel_flow",
            title: "Debit → Cancel flow",
            expected: "Cancel returns cancelled status",
            steps: [
                {
                    id: "debit",
                    title: "Create Debit",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    body: { 
                        merchantId: "{{context.merchantId}}",
                        customerId: "{{context.customerId}}",
                        amount: "{{input.amount}}",
                        region: "{{context.region}}"
                    },
                    extract: [{ var: "debitId", from: "json", path: "id" }],
                    assert: [{ type: "status_in", expected: [200, 201] }]
                },
                {
                    id: "cancel",
                    title: "Cancel Debit",
                    method: "POST",
                    url: "{{context.url}}/debit/{{vars.debitId}}/cancel",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    dependsOn: ["debit"],
                    assert: [{ type: "status_in", expected: [200, 202] }]
                },
                {
                    id: "check",
                    title: "Check Cancelled",
                    method: "GET",
                    url: "{{context.url}}/debit/{{vars.debitId}}",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    dependsOn: ["cancel"],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_in", path: "status", expected: ["cancelled", "canceled"] }
                    ]
                }
            ]
        }
    ]
};