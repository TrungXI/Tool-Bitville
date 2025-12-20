export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type AssertRule =
    | { type: "status_in"; expected: number[] }
    | { type: "json_path_eq"; path: string; expected: any }
    | { type: "json_path_in"; path: string; expected: any[] }
    | { type: "json_path_exists"; path: string }
    | { type: "equals"; actualVar: string; expected: any } // compare extracted var
    | { type: "custom"; name: "debit_credit_cancel"; params?: Record<string, any> };

export type ExtractRule = {
    var: string;         // save into context[var]
    from: "json" | "text";
    path?: string;       // json path (simple dot path)
};

export type StepDef = {
    id: string;
    title: string;

    method: HttpMethod;
    url: string;         // can contain {{vars}}
    headers?: Record<string, string>; // can contain {{vars}}
    body?: any;          // can contain {{vars}}

    await?: boolean;     // default true (sequential). For parallel groups, see "parallelGroup"
    parallelGroup?: string; // steps with same group run in parallel then merge results

    extract?: ExtractRule[];
    assert?: AssertRule[];

    // optional: step depends on other step ids
    dependsOn?: string[];
};

export type TestCaseDef = {
    id: string;
    title: string;
    description?: string;
    steps: StepDef[];
};

export type ProviderSuite = {
    provider: string;
    title: string;
    baseVars?: Record<string, any>; // default context vars
    cases: TestCaseDef[];
};

// ---- Example suites ----
export const TEST_SUITES: Record<string, ProviderSuite> = {
    stripe: {
        provider: "stripe",
        title: "Stripe Suite",
        baseVars: {
            // example base vars
        },
        cases: [
            {
                id: "debit-credit-happy",
                title: "Debit rồi Credit (happy flow)",
                description: "Tạo debit -> check status -> tạo credit -> check balance/ trạng thái",
                steps: [
                    {
                        id: "create_debit",
                        title: "Create Debit",
                        method: "POST",
                        url: "{{downstreamUrl}}/debit",
                        body: {
                            customerId: "{{input.customerId}}",
                            amount: "{{input.amount}}"
                        },
                        extract: [
                            { var: "debitId", from: "json", path: "id" },
                            { var: "debitStatus", from: "json", path: "status" }
                        ],
                        assert: [
                            { type: "status_in", expected: [200, 201] },
                            { type: "json_path_in", path: "status", expected: ["created", "pending", "success"] }
                        ]
                    },
                    {
                        id: "check_debit",
                        title: "Check Debit Status",
                        method: "GET",
                        url: "{{downstreamUrl}}/debit/{{debitId}}",
                        extract: [{ var: "debitStatus2", from: "json", path: "status" }],
                        assert: [
                            { type: "status_in", expected: [200] },
                            { type: "custom", name: "debit_credit_cancel" }
                        ]
                    },
                    {
                        id: "create_credit",
                        title: "Create Credit",
                        method: "POST",
                        url: "{{downstreamUrl}}/credit",
                        body: {
                            debitId: "{{debitId}}",
                            amount: "{{input.amount}}"
                        },
                        extract: [
                            { var: "creditId", from: "json", path: "id" },
                            { var: "creditStatus", from: "json", path: "status" }
                        ],
                        assert: [{ type: "status_in", expected: [200, 201] }]
                    }
                ]
            },

            {
                id: "cancel-flow",
                title: "Debit rồi Cancel",
                steps: [
                    {
                        id: "create_debit",
                        title: "Create Debit",
                        method: "POST",
                        url: "{{downstreamUrl}}/debit",
                        body: { customerId: "{{input.customerId}}", amount: "{{input.amount}}" },
                        extract: [{ var: "debitId", from: "json", path: "id" }],
                        assert: [{ type: "status_in", expected: [200, 201] }]
                    },
                    {
                        id: "cancel_debit",
                        title: "Cancel Debit",
                        method: "POST",
                        url: "{{downstreamUrl}}/debit/{{debitId}}/cancel",
                        assert: [{ type: "status_in", expected: [200, 202] }]
                    },
                    {
                        id: "check_cancelled",
                        title: "Check Cancelled",
                        method: "GET",
                        url: "{{downstreamUrl}}/debit/{{debitId}}",
                        assert: [
                            { type: "status_in", expected: [200] },
                            { type: "json_path_in", path: "status", expected: ["cancelled", "canceled"] }
                        ]
                    }
                ]
            }
        ]
    }
};