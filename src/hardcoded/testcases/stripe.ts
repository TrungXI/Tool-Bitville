import type { ProviderSuite } from "./_types";

export const STRIPE_SUITE: ProviderSuite = {
    provider: "stripe",
    title: "Stripe Test Suite",
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
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: { tkn: "{{context.token}}", prid: "{{context.providerId}}" },
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_in", path: "err", expected: [0, 1] }
                    ]
                }
            ]
        },
        {
            id: "auth_wrong_secret",
            title: "Authenticate With Wrong Secret Key",
            expected: "Authenticate fail with expected err code",
            steps: [
                {
                    id: "authenticate",
                    title: "Authenticate",
                    method: "POST",
                    url: "{{context.url}}/authenticate",
                    headers: { SecretKey: "WRONG_SECRET" },
                    body: { tkn: "{{context.token}}", prid: "{{context.providerId}}" },
                    assert: [
                        { type: "status_in", expected: [200, 400, 401] },
                        { type: "json_path_exists", path: "err" }
                    ]
                }
            ]
        },
        {
            id: "debit_credit_flow",
            title: "Debit → Credit flow",
            expected: "Debit ok, then credit ok",
            steps: [
                {
                    id: "debit",
                    title: "Create Debit",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: {
                        operatorId: "{{context.operatorId}}",
                        playerId: "{{context.playerId}}",
                        amount: "{{input.amount}}",
                        currencyId: "{{context.currencyId}}"
                    },
                    extract: [
                        { var: "debitId", from: "json", path: "id" },
                        { var: "debitStatus", from: "json", path: "status" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "custom", name: "non_empty", params: { path: "id" } }
                    ]
                },
                {
                    id: "credit",
                    title: "Create Credit",
                    method: "POST",
                    url: "{{context.url}}/credit",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: { debitId: "{{vars.debitId}}", amount: "{{input.amount}}" },
                    dependsOn: ["debit"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "custom", name: "debit_credit_cancel" }
                    ]
                }
            ]
        }
    ]
};