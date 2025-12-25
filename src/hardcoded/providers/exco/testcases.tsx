import type { ProviderSuite, StepDef, TestCaseDef } from "../../testcases/_types";

/**
 * Excommunicado Provider Test Cases
 * 
 * Định nghĩa các test cases cho Exco provider
 * - type: "withdraw" = debit (trừ tiền)
 * - type: "deposit" = credit (cộng tiền)
 * - roundId phải giống nhau giữa debit và credit
 */
const postBlanceBefore = {
    id: "post_balance_before",
    title: "Post Balance",
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
} as StepDef

const postBlanceAfter = {
    id: "post_balance_after",
    title: "Post Balance",
    method: "POST",
    url: "{{input.url}}/balance",
    headers: {},
    body: {
        "key": "{{input.token}}"
    },
    extract: [
        { var: "balanceAfter", from: "json", path: "balance" },
        { var: "nativeId", from: "json", path: "nativeId" }
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
} as StepDef

const debitAction = {
    id: "withdraw",
    title: "Withdraw (Debit) - Trừ tiền",
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
    dependsOn: ["post_balance_before"],
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
}
const debitFreespinAction = {
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
    dependsOn: ["post_balance_before"],
    assert: [
        { type: "status_in", expected: [200, 201] },
        {
            type: "json_path_equals_var",
            path: "balance",
            var: "balanceBefore"
        }
    ]
}
const creditAction = {
    id: "deposit",
    title: "Deposit (Credit) - Cộng tiền với cùng roundId",
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
}
const creditFreespinAction = {
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
}
const CasesOne = {
    id: "get_balance_before",
    title: "Balance Flow",
    expected: "Get balance",
    steps: [
        postBlanceBefore,
    ]
} as TestCaseDef

const CasesTwo = {
    id: "withdraw_deposit_flow",
    title: "Withdraw (Debit) → Deposit (Credit) Flow",
    expected: "Withdraw trừ tiền, Deposit cộng tiền với cùng roundId",
    steps: [
        postBlanceBefore,
        debitAction,
        creditAction,
        postBlanceAfter
    ]
} as TestCaseDef

const CasesThree = {
    id: "withdraw_deposit_freespin_flow",
    title: "Withdraw (Debit) → Deposit (Credit) FreeSpin Flow",
    expected: "Note",
    steps: [
        postBlanceBefore,
        debitFreespinAction,
        creditFreespinAction,
        postBlanceAfter,
    ]
} as TestCaseDef

export const EXCO_SUITE: ProviderSuite = {
    provider: "exco",
    title: "Excommunicado Test Suite",
    cases: [
        CasesOne,
        CasesTwo,
        CasesThree,
    ]
};

