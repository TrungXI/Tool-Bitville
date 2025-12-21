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
                        { type: "status_in", expected: [400, 401, 500] },
                        { type: "json_path_exists", path: "err" },
                        { type: "custom", name: "error_message", params: { message: "invalid", messagePath: "message" } }
                    ]
                }
            ]
        },
        {
            id: "debit_invalid_amount",
            title: "Debit With Invalid Amount (Should Return 400)",
            expected: "Debit fails with 400 and error message",
            steps: [
                {
                    id: "debit",
                    title: "Create Debit with negative amount",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: {
                        operatorId: "{{context.operatorId}}",
                        providerId: "{{input.providerId}}",
                        playerId: "{{context.playerId}}",
                        amount: -100,
                        currencyId: "{{context.currencyId}}"
                    },
                    assert: [
                        { type: "status_in", expected: [400, 422] },
                        { type: "json_path_exists", path: "err" },
                        { type: "custom", name: "error_message", params: { message: "invalid", messagePath: "message" } }
                    ]
                }
            ]
        },
        {
            id: "balance_debit_balance_check",
            title: "Balance → Debit → Balance (Balance Must Decrease)",
            expected: "Balance decreases after debit",
            steps: [
                {
                    id: "get_balance_before",
                    title: "Get Balance Before Debit",
                    method: "GET",
                    url: "{{context.url}}/getbalance?operatorId={{context.operatorId}}&playerId={{context.playerId}}",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "debit",
                    title: "Create Debit",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: {
                        operatorId: "{{context.operatorId}}",
                        providerId: "{{input.providerId}}",
                        playerId: "{{context.playerId}}",
                        amount: "{{input.amount}}",
                        currencyId: "{{context.currencyId}}"
                    },
                    extract: [
                        { var: "debitId", from: "json", path: "id" },
                        { var: "debitAmount", from: "json", path: "amount" }
                    ],
                    dependsOn: ["get_balance_before"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "custom", name: "non_empty", params: { path: "id" } }
                    ]
                },
                {
                    id: "get_balance_after",
                    title: "Get Balance After Debit",
                    method: "GET",
                    url: "{{context.url}}/getbalance?operatorId={{context.operatorId}}&playerId={{context.playerId}}",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    extract: [
                        { var: "balanceAfter", from: "json", path: "balance" }
                    ],
                    dependsOn: ["debit"],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" },
                        { type: "custom", name: "balance_decreased", params: { beforeVar: "balanceBefore", afterVar: "balanceAfter", amountVar: "debitAmount" } }
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
                        providerId: "{{input.providerId}}",
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
        },
        {
            id: "balance_debit_credit_with_betid",
            title: "Balance → Debit (with betId) → Credit (with betId) - Check Balance in Response",
            expected: "Debit response shows correct balance decrease, Credit response shows correct balance increase",
            steps: [
                {
                    id: "get_balance_before",
                    title: "Get Balance Before",
                    method: "GET",
                    url: "{{context.url}}/getbalance?operatorId={{context.operatorId}}&playerId={{context.playerId}}",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "debit_with_betid",
                    title: "Create Debit with betId",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: {
                        operatorId: "{{context.operatorId}}",
                        providerId: "{{input.providerId}}",
                        playerId: "{{context.playerId}}",
                        amount: "{{input.amount}}",
                        currencyId: "{{context.currencyId}}",
                        betId: "{{input.betId}}",
                        transactionId: "{{input.transactionId}}",
                        reference: "{{input.reference}}"
                    },
                    extract: [
                        { var: "debitId", from: "json", path: "id" },
                        { var: "debitBetId", from: "json", path: "betId" },
                        { var: "debitAmount", from: "json", path: "amount" },
                        { var: "balanceAfterDebit", from: "json", path: "balance" }
                    ],
                    dependsOn: ["get_balance_before"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "custom", name: "non_empty", params: { path: "id" } },
                        { type: "json_path_exists", path: "betId" },
                        { 
                            type: "custom", 
                            name: "balance_in_response",
                            params: { 
                                beforeVar: "balanceBefore", 
                                amountVar: "debitAmount",
                                operation: "debit"
                            }
                        }
                    ]
                },
                {
                    id: "credit_with_betid",
                    title: "Create Credit with betId from Debit",
                    method: "POST",
                    url: "{{context.url}}/credit",
                    headers: { SecretKey: "{{context.secretKey}}" },
                    body: {
                        betId: "{{vars.debitBetId}}",
                        amount: "{{input.amount}}",
                        transactionId: "{{input.transactionId}}",
                        reference: "{{input.reference}}"
                    },
                    extract: [
                        { var: "creditId", from: "json", path: "id" },
                        { var: "creditAmount", from: "json", path: "amount" },
                        { var: "balanceAfterCredit", from: "json", path: "balance" }
                    ],
                    dependsOn: ["debit_with_betid"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "custom", name: "non_empty", params: { path: "id" } },
                        {
                            type: "custom",
                            name: "balance_in_response",
                            params: {
                                beforeVar: "balanceAfterDebit",
                                amountVar: "creditAmount",
                                operation: "credit"
                            }
                        },
                        {
                            type: "custom",
                            name: "balance_increased",
                            params: {
                                beforeVar: "balanceAfterDebit",
                                afterVar: "balanceAfterCredit",
                                amountVar: "creditAmount"
                            }
                        }
                    ]
                }
            ]
        }
    ]
};