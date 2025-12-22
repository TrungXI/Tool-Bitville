import type { ProviderSuite } from "../../testcases/_types";

/**
 * Excommunicado Provider Test Cases
 * 
 * Định nghĩa các test cases cho Exco provider
 * - type: "withdraw" = debit (trừ tiền)
 * - type: "deposit" = credit (cộng tiền)
 * - roundId phải giống nhau giữa debit và credit
 */

export const EXCO_SUITE: ProviderSuite = {
    provider: "exco",
    title: "Excommunicado Test Suite",
    cases: [
        {
            id: "get_balance_before",
            title: "Balance Flow",
            expected: "Get balance",
            steps: [
                {
                    id: "get_balance_authenticate_before",
                    title: "POST Authenticate Balance Before",
                    method: "POST",
                    url: "{{input.url}}/authenticate",
                    headers: {},
                    body: {
                        "key": "{{input.key}}"
                    },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "get_balance_before",
                    title: "POST Balance Before",
                    method: "POST",
                    url: "{{input.url}}/balance",
                    headers: {},
                    body: {
                        "key": "{{input.key}}"
                    },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                }
            ]
        },
        {
            id: "withdraw_deposit_flow",
            title: "Withdraw (Debit) → Deposit (Credit) Flow",
            expected: "Withdraw trừ tiền, Deposit cộng tiền với cùng roundId",
            steps: [
                {
                    id: "post_authenticate_balance_before",
                    title: "POST Authenticate Balance Before",
                    method: "POST",
                    url: "{{input.url}}/authenticate",
                    headers: {},
                    body: {
                        "key": "{{input.key}}",
                        "operator": "bitville",
                        "wallet": "bitville",
                        "provider": "excommunicado",
                        "game": "vegascaline",
                        "ip": "14.186.133.103",
                        "channel": "desktop"
                    },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "get_balance_before",
                    title: "POST Balance Before",
                    method: "POST",
                    url: "{{input.url}}/balance",
                    headers: {},
                    body: {
                        "key": "{{input.key}}"
                    },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" },
                        { var: "nativeId", from: "json", path: "nativeId" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "withdraw",
                    title: "Withdraw (Debit) - Trừ tiền",
                    method: "POST",
                    url: "{{input.url}}/transaction",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: {
                        nativeId: "{{vars.nativeId}}",
                        playerId: "{{vars.nativeId}}",
                        transactionId: "{{input.transactionId}}",
                        type: "withdraw",
                        provider: "excommunicado",
                        amount: "{{input.amount}}",
                        game: "{{input.game}}",
                        roundId: "{{input.roundId}}",
                        roundFinished: false,
                        category: "{{input.category}}",
                        name: "{{input.name}}",
                        ip: "{{input.ip}}"
                    },
                    extract: [
                        { var: "withdrawTransactionId", from: "json", path: "transactionId" },
                        { var: "withdrawRoundId", from: "json", path: "roundId" },
                        { var: "withdrawAmount", from: "json", path: "amount" },
                        { var: "balanceAfterWithdraw", from: "json", path: "balance" }
                    ],
                    dependsOn: ["get_balance_before"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "json_path_exists", path: "transactionId" },
                        { type: "json_path_exists", path: "roundId" },
                        {
                            type: "custom",
                            name: "balance_in_response",
                            params: {
                                beforeVar: "balanceBefore",
                                amountVar: "withdrawAmount",
                                operation: "debit"
                            }
                        }
                    ]
                },
                {
                    id: "deposit",
                    title: "Deposit (Credit) - Cộng tiền với cùng roundId",
                    method: "POST",
                    url: "{{context.url}}/transaction",
                    headers: {
                        "Content-Type": "application/json",
                        // "API-Key": "{{context.apiKey}}"
                    },
                    body: {
                        nativeId: "{{input.nativeId}}",
                        playerId: "{{context.playerId}}",
                        transactionId: "{{input.transactionId}}",
                        type: "deposit",
                        provider: "excommunicado",
                        amount: "{{input.amount}}",
                        game: "{{input.game}}",
                        roundId: "{{vars.withdrawRoundId}}", // Sử dụng roundId từ withdraw
                        roundFinished: true,
                        category: "{{input.category}}",
                        name: "{{input.name}}",
                        ip: "{{input.ip}}"
                    },
                    extract: [
                        { var: "depositTransactionId", from: "json", path: "transactionId" },
                        { var: "depositRoundId", from: "json", path: "roundId" },
                        { var: "depositAmount", from: "json", path: "amount" },
                        { var: "balanceAfterDeposit", from: "json", path: "balance" }
                    ],
                    dependsOn: ["withdraw"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "json_path_exists", path: "transactionId" },
                        { type: "json_path_exists", path: "roundId" },
                        // Verify roundId giống nhau
                        {
                            type: "equals_var",
                            var: "depositRoundId",
                            expected: "{{vars.withdrawRoundId}}"
                        },
                        {
                            type: "custom",
                            name: "balance_in_response",
                            params: {
                                beforeVar: "balanceAfterWithdraw",
                                amountVar: "depositAmount",
                                operation: "credit"
                            }
                        },
                        {
                            type: "custom",
                            name: "balance_increased",
                            params: {
                                beforeVar: "balanceAfterWithdraw",
                                afterVar: "balanceAfterDeposit",
                                amountVar: "depositAmount"
                            }
                        }
                    ]
                },
                {
                    id: "get_balance_after",
                    title: "POST Balance After",
                    method: "POST",
                    url: "{{context.url}}/balance",
                    headers: {
                        // "API-Key": "{{context.apiKey}}"
                    },
                    body: {
                        "key": "{{context.playerId}}"
                    },
                    extract: [
                        { var: "balanceAfter", from: "json", path: "balance" }
                    ],
                    dependsOn: ["deposit"],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                }
            ]
        },
        {
            id: "withdraw_only",
            title: "Withdraw Only - Trừ tiền",
            expected: "Withdraw thành công và trừ đúng số tiền",
            steps: [
                {
                    id: "get_balance_before",
                    title: "Get Balance Before",
                    method: "GET",
                    url: "{{context.url}}/balance?playerId={{context.playerId}}",
                    headers: {
                        // "API-Key": "{{context.apiKey}}"
                    },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "withdraw",
                    title: "Withdraw (Debit)",
                    method: "POST",
                    url: "{{context.url}}/transaction",
                    headers: {
                        "Content-Type": "application/json",
                        // "API-Key": "{{context.apiKey}}"
                    },
                    body: {
                        nativeId: "{{input.nativeId}}",
                        playerId: "{{context.playerId}}",
                        transactionId: "{{input.transactionId}}",
                        type: "withdraw",
                        provider: "excommunicado",
                        amount: "{{input.amount}}",
                        game: "{{input.game}}",
                        roundId: "{{input.roundId}}",
                        roundFinished: false,
                        category: "{{input.category}}",
                        name: "{{input.name}}",
                        ip: "{{input.ip}}"
                    },
                    extract: [
                        { var: "withdrawTransactionId", from: "json", path: "transactionId" },
                        { var: "withdrawRoundId", from: "json", path: "roundId" },
                        { var: "withdrawAmount", from: "json", path: "amount" },
                        { var: "balanceAfterWithdraw", from: "json", path: "balance" }
                    ],
                    dependsOn: ["get_balance_before"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "json_path_exists", path: "transactionId" },
                        { type: "json_path_exists", path: "roundId" },
                        {
                            type: "custom",
                            name: "balance_decreased",
                            params: {
                                beforeVar: "balanceBefore",
                                afterVar: "balanceAfterWithdraw",
                                amountVar: "withdrawAmount"
                            }
                        }
                    ]
                }
            ]
        },
        {
            id: "deposit_only",
            title: "Deposit Only - Cộng tiền",
            expected: "Deposit thành công và cộng đúng số tiền",
            steps: [
                {
                    id: "get_balance_before",
                    title: "Get Balance Before",
                    method: "GET",
                    url: "{{context.url}}/balance?playerId={{context.playerId}}",
                    headers: {
                        // "API-Key": "{{context.apiKey}}"
                    },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "deposit",
                    title: "Deposit (Credit)",
                    method: "POST",
                    url: "{{context.url}}/transaction",
                    headers: {
                        "Content-Type": "application/json",
                        // "API-Key": "{{context.apiKey}}"
                    },
                    body: {
                        nativeId: "{{input.nativeId}}",
                        playerId: "{{context.playerId}}",
                        transactionId: "{{input.transactionId}}",
                        type: "deposit",
                        provider: "excommunicado",
                        amount: "{{input.amount}}",
                        game: "{{input.game}}",
                        roundId: "{{input.roundId}}",
                        roundFinished: true,
                        category: "{{input.category}}",
                        name: "{{input.name}}",
                        ip: "{{input.ip}}"
                    },
                    extract: [
                        { var: "depositTransactionId", from: "json", path: "transactionId" },
                        { var: "depositRoundId", from: "json", path: "roundId" },
                        { var: "depositAmount", from: "json", path: "amount" },
                        { var: "balanceAfterDeposit", from: "json", path: "balance" }
                    ],
                    dependsOn: ["get_balance_before"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        { type: "json_path_exists", path: "transactionId" },
                        { type: "json_path_exists", path: "roundId" },
                        {
                            type: "custom",
                            name: "balance_increased",
                            params: {
                                beforeVar: "balanceBefore",
                                afterVar: "balanceAfterDeposit",
                                amountVar: "depositAmount"
                            }
                        }
                    ]
                }
            ]
        }
    ]
};

