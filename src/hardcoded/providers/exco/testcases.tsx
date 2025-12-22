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
            id: "withdraw_deposit_flow",
            title: "Withdraw (Debit) → Deposit (Credit) Flow",
            expected: "Withdraw trừ tiền, Deposit cộng tiền với cùng roundId",
            steps: [
                {
                    id: "get_balance_before",
                    title: "POST Balance Before",
                    method: "POST",
                    url: "{{context.url}}/authenticate",
                    headers: {
                        // "API-Key": "{{context.apiKey}}"
                    },
                    body: {
                        "key": "{{context.key}}"
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
                    url: "{{context.url}}/balance",
                    headers: {
                        // "API-Key": "{{context.apiKey}}"
                    },
                    body: {
                        "key": "{{context.nativeId}}"
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
                    title: "Withdraw (Debit) - Trừ tiền",
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

