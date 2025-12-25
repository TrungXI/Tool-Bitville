import type { ProviderSuite, TestCaseDef } from "../../testcases/_types";

/**
 * Blacklagoon Provider Test Cases
 * 
 * Định nghĩa các test cases cho Blacklagoon provider
 * - type: "withdraw" = debit (trừ tiền)
 * - type: "deposit" = credit (cộng tiền)
 * - roundId phải giống nhau giữa debit và credit
 */
const CasesOne = {
    id: "get_balance_before",
    title: "Balance Flow",
    expected: "Get balance",
    steps: [
        {
            id: "post_balance",
            title: "POST Balance",
            method: "POST",
            url: "{{input.url}}/getbalance",
            headers: {},
            body: {
                "playerid": "{{input.playerid}}"
            },
            extract: [
                { var: "balanceBefore", from: "json", path: "cashbalance" }
            ],
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "cashbalance" }
            ]
        }
    ]
} as TestCaseDef

const CasesTwo = {
    id: "withdraw_deposit_flow",
    title: "Withdraw (Debit) → Deposit (Credit) Flow",
    expected: "Withdraw trừ tiền, Deposit cộng tiền với cùng roundId",
    steps: [
        {
            id: "post_balance",
            title: "POST Balance",
            method: "POST",
            url: "{{input.url}}/getbalance",
            headers: {},
            body: {
                "playerid": "{{input.playerid}}"
            },
            extract: [
                { var: "balanceBefore", from: "json", path: "cashbalance" }
            ],
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "cashbalance" }
            ]
        },
        {
            id: "withdraw",
            title: "Withdraw (Debit) - Trừ tiền",
            method: "POST",
            url: "{{input.url}}/debit",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                "playerid": "{{input.playerid}}",
                "debitamount": "{{input.amount}}",
                "transid": "{{input.transactionId}}",
                "roundid": "{{input.roundId}}"
                // "externalfreebetid": "{{input.freespinId}}"
            },
            extract: [
                { var: "withdrawAmount", from: "json", path: "amount" },
                { var: "balanceAfterWithdraw", from: "json", path: "balance" },
                { var: "withdrawRoundId", from: "input", path: "roundId" }
            ],
            dependsOn: ["post_balance"],
            assert: [
                { type: "status_in", expected: [200, 201] },
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
            url: "{{input.url}}/credit",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                "playerid": "{{input.playerid}}",
                "creditamount": "{{input.amount}}",
                "transid": "{{input.transactionId}}",
                "debittransid": "{{vars.withdrawRoundId}}"
                // "externalfreebetid": "{{input.freespinId}}"
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
            id: "post_balance",
            title: "POST Balance",
            method: "POST",
            url: "{{input.url}}/getbalance",
            headers: {},
            body: {
                "playerid": "{{input.playerid}}"
            },
            extract: [
                { var: "balanceBefore", from: "json", path: "cashbalance" }
            ],
            dependsOn: ["deposit"],
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "balance" },
                {
                    type: "json_path_equals_var",
                    path: "balance",
                    var: "balanceAfterDeposit"
                },
            ]
        }
    ]
} as TestCaseDef

const CasesThree = {
    id: "withdraw_deposit_freespin_flow",
    title: "Withdraw (Debit) → Deposit (Credit) FreeSpin Flow",
    expected: "Note",
    steps: [
        {
            id: "post_authenticate",
            title: "POST Authenticate",
            method: "POST",
            url: "{{input.url}}/authenticate",
            headers: {},
            body: {
                "key": "{{input.token}}",
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
            id: "post_balance",
            title: "POST Balance",
            method: "POST",
            url: "{{input.url}}/balance",
            headers: {},
            body: {
                "key": "{{input.token}}"
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
            title: "Withdraw (Debit) - Freespin",
            method: "POST",
            url: "{{input.url}}/transaction",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                nativeId: "{{vars.nativeId}}",
                transactionId: "{{input.transactionId}}",
                type: "withdraw",
                amount: "{{input.amount}}",
                roundId: "{{input.roundId}}",
                campaignId: "{{input.freespinId}}",
                campaignType: "freeBets"
            },
            extract: [
                { var: "withdrawAmount", from: "json", path: "amount" },
                { var: "balanceAfterWithdraw", from: "json", path: "balance" },
                { var: "withdrawRoundId", from: "input", path: "roundId" }
            ],
            dependsOn: ["post_balance"],
            assert: [
                { type: "status_in", expected: [200, 201] },
                {
                    type: "json_path_equals_var",
                    path: "balance",
                    var: "balanceBefore"
                }
            ]
        },
        {
            id: "deposit",
            title: "Deposit (Credit) FreeSpin",
            method: "POST",
            url: "{{input.url}}/transaction",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                nativeId: "{{vars.nativeId}}",
                transactionId: "{{input.transactionId}}",
                type: "deposit",
                amount: "{{input.amount}}",
                roundId: "{{vars.withdrawRoundId}}",
                campaignId: "{{input.freespinId}}",
                campaignType: "freeBets"
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
            id: "post_balance_after",
            title: "POST Balance After",
            method: "POST",
            url: "{{input.url}}/balance",
            headers: {},
            body: {
                "key": "{{input.token}}"
            },
            extract: [
                { var: "balanceAfter", from: "json", path: "balance" }
            ],
            dependsOn: ["deposit"],
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "balance" },
                {
                    type: "json_path_equals_var",
                    path: "balance",
                    var: "balanceAfterDeposit"
                },
            ]
        }
    ]
} as TestCaseDef
const CasesFour = {
    id: "withdraw_duplicate_flow",
    title: "Withdraw (Debit) Duplicate Flow",
    expected: "Note",
    steps: [
        {
            id: "post_authenticate",
            title: "POST Authenticate",
            method: "POST",
            url: "{{input.url}}/authenticate",
            headers: {},
            body: {
                "key": "{{input.token}}",
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
            id: "post_balance",
            title: "POST Balance",
            method: "POST",
            url: "{{input.url}}/balance",
            headers: {},
            body: {
                "key": "{{input.token}}"
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
            title: "Withdraw (Debit) First",
            method: "POST",
            url: "{{input.url}}/transaction",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                nativeId: "{{vars.nativeId}}",
                transactionId: "{{input.transactionId}}",
                type: "withdraw",
                amount: "{{input.amount}}",
                roundId: "{{input.roundId}}",
            },
            extract: [
                { var: "withdrawAmount", from: "json", path: "amount" },
                { var: "balanceAfterWithdraw", from: "json", path: "balance" },
                { var: "withdrawRoundId", from: "input", path: "roundId" }
            ],
            dependsOn: ["post_balance"],
            assert: [
                { type: "status_in", expected: [200, 201] },
                {
                    type: "json_path_equals_var",
                    path: "balance",
                    var: "balanceBefore"
                }
            ]
        },
        {
            id: "withdraw_duplicate",
            title: "Withdraw (Debit) Second Duplicate",
            method: "POST",
            url: "{{input.url}}/transaction",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                nativeId: "{{vars.nativeId}}",
                transactionId: "{{input.transactionId}}",
                type: "withdraw",
                amount: "{{input.amount}}",
                roundId: "{{vars.withdrawRoundId}}",
            },
            extract: [
                { var: "withdrawAmount", from: "json", path: "amount" },
                { var: "balanceAfterWithdraw", from: "json", path: "balance" },
                { var: "withdrawRoundId", from: "input", path: "roundId" }
            ],
            dependsOn: ["post_balance"],
            assert: [
                { type: "status_in", expected: [200, 201] },
                {
                    type: "json_path_equals_var",
                    path: "balance",
                    var: "balanceBefore"
                }
            ]
        },
        {
            id: "post_balance_after",
            title: "POST Balance After",
            method: "POST",
            url: "{{input.url}}/balance",
            headers: {},
            body: {
                "key": "{{input.token}}"
            },
            extract: [
                { var: "balanceAfter", from: "json", path: "balance" }
            ],
            dependsOn: ["withdraw_duplicate"],
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "balance" },
                {
                    type: "json_path_equals_var",
                    path: "balance",
                    var: "balanceAfterDeposit"
                },
            ]
        }
    ]
} as TestCaseDef

export const BLACKLAGOON_SUITE: ProviderSuite = {
    provider: "blacklagoon",
    title: "Blacklagoon Test Suite",
    cases: [
        CasesOne,
        CasesTwo,
        // CasesThree,
        // CasesFour
    ]
};

