export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ExtractRule = {
    var: string;
    from: "json" | "text";
    path?: string; // json dot path
};

export type AssertRule =
    | { type: "status_in"; expected: number[] }
    | { type: "json_path_eq"; path: string; expected: any }
    | { type: "json_path_in"; path: string; expected: any[] }
    | { type: "json_path_exists"; path: string }
    | { type: "json_path_contains"; path: string; expected: string } // Check if path contains expected string
    | { type: "equals_var"; var: string; expected: any }
    | { type: "custom"; name: "debit_credit_cancel" | "non_empty" | "balance_decreased" | "error_message" | "balance_in_response" | "balance_increased"; params?: Record<string, any> };

export type StepDef = {
    id: string;
    title: string;

    method: HttpMethod;
    url: string; // supports {{context.xxx}} {{vars.xxx}} {{input.xxx}}
    headers?: Record<string, string>;
    body?: any;

    dependsOn?: string[];       // optional explicit dependencies
    parallelGroup?: string;     // steps with same group run parallel after deps satisfied

    extract?: ExtractRule[];
    assert?: AssertRule[];
};

export type TestCaseDef = {
    id: string;
    title: string;
    expected?: string;
    steps: StepDef[];
};

export type ProviderSuite = {
    provider: string;
    title: string;
    cases: TestCaseDef[];
};