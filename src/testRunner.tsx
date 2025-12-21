import type { StepDef, TestCaseDef, AssertRule, ExtractRule } from "./hardcoded/testcases";

export type StepResult = {
    id: string;
    title: string;
    request: { method: string; url: string; headers: Record<string, string>; body?: any };
    response: { ok: boolean; status: number; elapsedMs: number; headers: Record<string, string>; text: string; json?: any };
    extracts: Record<string, any>;
    assertions: { rule: AssertRule; passed: boolean; message?: string }[];
    passed: boolean;
    error?: string;
};

export type RunResult = {
    caseId: string;
    title: string;
    startedAt: string;
    finishedAt: string;
    passed: boolean;
    context: Record<string, any>; // final context
    steps: StepResult[];
    message?: string; // first failure message or error
    expected?: string; // expected outcome from testcase
};

function deepGet(obj: any, path: string): any {
    // simple dot path: a.b.c
    if (!path) return undefined;
    return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function template(str: string, ctx: Record<string, any>) {
    return str.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
        const v = deepGet(ctx, expr.trim());
        return v === undefined || v === null ? "" : String(v);
    });
}

function templateAny(value: any, ctx: Record<string, any>): any {
    if (typeof value === "string") return template(value, ctx);
    if (Array.isArray(value)) return value.map((x) => templateAny(x, ctx));
    if (value && typeof value === "object") {
        const out: any = {};
        for (const [k, v] of Object.entries(value)) out[k] = templateAny(v, ctx);
        return out;
    }
    return value;
}

async function httpCall(method: string, url: string, headers: Record<string, string>, body?: any) {
    const started = Date.now();
    const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const elapsedMs = Date.now() - started;
    const text = await res.text();
    let json: any = undefined;
    try { json = JSON.parse(text); } catch { }
    return {
        ok: res.ok,
        status: res.status,
        elapsedMs,
        headers: Object.fromEntries(res.headers.entries()),
        text,
        json
    };
}

function applyExtract(extracts: ExtractRule[] | undefined, resp: { text: string; json?: any }) {
    const out: Record<string, any> = {};
    if (!extracts?.length) return out;

    for (const ex of extracts) {
        if (ex.from === "text") out[ex.var] = resp.text;
        else if (ex.from === "json") out[ex.var] = ex.path ? deepGet(resp.json, ex.path) : resp.json;
    }
    return out;
}

function evalAssert(
    rule: AssertRule, 
    ctx: Record<string, any>, 
    resp: { status: number; json?: any; text: string },
    responseFields?: {
        balance?: string;
        errorMessage?: string;
        errorCode?: string;
        status?: string;
        transactionId?: string;
        amount?: string;
    }
) {
    const fail = (message: string) => ({ passed: false, message });
    const pass = () => ({ passed: true as const });

    switch (rule.type) {
        case "status_in":
            return rule.expected.includes(resp.status)
                ? pass()
                : fail(`status=${resp.status} not in [${rule.expected.join(", ")}]`);

        case "json_path_eq": {
            const actual = deepGet(resp.json, rule.path);
            return actual === rule.expected
                ? pass()
                : fail(`path ${rule.path} expected=${JSON.stringify(rule.expected)} actual=${JSON.stringify(actual)}`);
        }

        case "json_path_in": {
            const actual = deepGet(resp.json, rule.path);
            return rule.expected.some((x) => x === actual)
                ? pass()
                : fail(`path ${rule.path} expected in ${JSON.stringify(rule.expected)} actual=${JSON.stringify(actual)}`);
        }

        case "json_path_exists": {
            const actual = deepGet(resp.json, rule.path);
            return actual !== undefined ? pass() : fail(`path ${rule.path} missing`);
        }

        case "json_path_contains": {
            const actual = deepGet(resp.json, rule.path);
            const actualStr = String(actual || "");
            const expectedStr = String(rule.expected || "");
            return actualStr.includes(expectedStr)
                ? pass()
                : fail(`path ${rule.path} expected to contain "${expectedStr}" but got "${actualStr}"`);
        }

        case "equals_var": {
            const actual = ctx[rule.var];
            return actual === rule.expected
                ? pass()
                : fail(`var ${rule.var} expected=${JSON.stringify(rule.expected)} actual=${JSON.stringify(actual)}`);
        }

        case "custom": {
            if (rule.name === "debit_credit_cancel") {
                // Example logic check: debitStatus2 không được là invalid, hoặc cancel thì không được success...
                const status = deepGet(resp.json, "status");
                const ok = ["created", "pending", "success", "cancelled", "canceled"].includes(status);
                return ok ? pass() : fail(`custom debit_credit_cancel failed: status=${status}`);
            }
            if (rule.name === "non_empty") {
                const path = rule.params?.path || "id";
                const value = deepGet(resp.json, path);
                const ok = value !== undefined && value !== null && value !== "";
                return ok ? pass() : fail(`custom non_empty failed: path ${path} is empty or missing`);
            }
            if (rule.name === "balance_decreased") {
                // Check if balance decreased after debit
                // params: { beforeVar: "balanceBefore", afterVar: "balanceAfter", amountVar: "debitAmount" }
                const beforeVar = rule.params?.beforeVar || "balanceBefore";
                const afterVar = rule.params?.afterVar || "balanceAfter";
                const amountVar = rule.params?.amountVar || "debitAmount";
                const before = parseFloat(ctx.vars[beforeVar]) || 0;
                const after = parseFloat(ctx.vars[afterVar]) || 0;
                // Try to get amount from vars first, then from input, then from context
                const amount = parseFloat(
                    ctx.vars[amountVar] || 
                    ctx.input?.amount || 
                    ctx.context?.amount || 
                    0
                ) || 0;
                const expectedAfter = before - amount;
                const ok = Math.abs(after - expectedAfter) < 0.01; // Allow small floating point differences
                return ok
                    ? pass()
                    : fail(`Balance not decreased correctly: before=${before}, after=${after}, expected=${expectedAfter}, debitAmount=${amount}`);
            }
            if (rule.name === "error_message") {
                // Check error message matches expected
                const expectedMsg = rule.params?.message || "";
                // Use configured errorMessage path or fallback to params or default
                const msgPath = rule.params?.messagePath || responseFields?.errorMessage || "message";
                const actualMsg = deepGet(resp.json, msgPath) || 
                                 deepGet(resp.json, responseFields?.errorMessage || "error") || 
                                 "";
                const ok = String(actualMsg).includes(expectedMsg);
                return ok
                    ? pass()
                    : fail(`Error message mismatch: expected to contain "${expectedMsg}" but got "${actualMsg}"`);
            }
            if (rule.name === "balance_in_response") {
                // Check balance in response matches expected calculation
                // params: { beforeVar: "balanceBefore", amountVar: "debitAmount", operation: "debit" | "credit" }
                const beforeVar = rule.params?.beforeVar || "balanceBefore";
                const amountVar = rule.params?.amountVar || "amount";
                const operation = rule.params?.operation || "debit"; // "debit" or "credit"
                const balancePath = rule.params?.balancePath || responseFields?.balance || "balance";
                
                const before = parseFloat(ctx.vars[beforeVar]) || 0;
                const amount = parseFloat(
                    ctx.vars[amountVar] || 
                    ctx.input?.amount || 
                    ctx.context?.amount || 
                    0
                ) || 0;
                const actualBalance = parseFloat(deepGet(resp.json, balancePath)) || 0;
                
                let expectedBalance: number;
                if (operation === "debit") {
                    expectedBalance = before - amount; // Balance should decrease
                } else {
                    expectedBalance = before + amount; // Balance should increase
                }
                
                const ok = Math.abs(actualBalance - expectedBalance) < 0.01;
                return ok
                    ? pass()
                    : fail(`Balance in response incorrect (${operation}): expected=${expectedBalance}, actual=${actualBalance}, before=${before}, amount=${amount}`);
            }
            if (rule.name === "balance_increased") {
                // Check if balance increased after credit
                // params: { beforeVar: "balanceBefore", afterVar: "balanceAfter", amountVar: "creditAmount" }
                const beforeVar = rule.params?.beforeVar || "balanceBefore";
                const afterVar = rule.params?.afterVar || "balanceAfter";
                const amountVar = rule.params?.amountVar || "creditAmount";
                const before = parseFloat(ctx.vars[beforeVar]) || 0;
                const after = parseFloat(ctx.vars[afterVar]) || 0;
                const amount = parseFloat(
                    ctx.vars[amountVar] || 
                    ctx.input?.amount || 
                    ctx.context?.amount || 
                    0
                ) || 0;
                const expectedAfter = before + amount;
                const ok = Math.abs(after - expectedAfter) < 0.01;
                return ok
                    ? pass()
                    : fail(`Balance not increased correctly: before=${before}, after=${after}, expected=${expectedAfter}, creditAmount=${amount}`);
            }
            return fail(`unknown custom rule: ${rule.name}`);
        }
    }
}

function topoSortSteps(steps: StepDef[]) {
    const map = new Map(steps.map((s) => [s.id, s]));
    const visited = new Set<string>();
    const temp = new Set<string>();
    const out: StepDef[] = [];

    function visit(id: string) {
        if (visited.has(id)) return;
        if (temp.has(id)) throw new Error(`Cycle dependency at step: ${id}`);
        temp.add(id);
        const s = map.get(id);
        if (!s) throw new Error(`Unknown step id: ${id}`);
        for (const dep of s.dependsOn ?? []) visit(dep);
        temp.delete(id);
        visited.add(id);
        out.push(s);
    }

    for (const s of steps) visit(s.id);
    return out;
}

export async function runTestCase(args: {
    testCase: TestCaseDef;
    context: Record<string, any>; // includes context.*, input.*
    commonHeaders: Record<string, string>;
    responseFields?: {
        balance?: string;
        errorMessage?: string;
        errorCode?: string;
        status?: string;
        transactionId?: string;
        amount?: string;
    };
    generateFields?: (
        input: Record<string, any>,
        context: Record<string, any>,
        vars: Record<string, any>
    ) => Record<string, any>;
}): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    // Build context with context.*, input.*, and vars.* namespaces
    const ctx: Record<string, any> = {
        context: args.context.context || {},
        input: args.context.providerInput || {},
        vars: {} // extracted variables go here
    };
    const stepsOrdered = topoSortSteps(args.testCase.steps);

    const results: StepResult[] = [];
    let allPassed = true;
    let firstFailureMessage: string | undefined;

    // handle parallel groups: execute sequentially by default, but if steps share same parallelGroup, run them together
    for (let i = 0; i < stepsOrdered.length;) {
        const s = stepsOrdered[i];
        if (!s) break;
        const group = s.parallelGroup;

        const batch: StepDef[] = [];
        if (group) {
            while (i < stepsOrdered.length && stepsOrdered[i]?.parallelGroup === group) {
                const step = stepsOrdered[i];
                if (step) batch.push(step);
                i++;
            }
        } else {
            batch.push(s);
            i++;
        }

        const batchResults = await Promise.all(
            batch.map(async (stepDef) => {
                if (!stepDef) {
                    return {
                        id: "unknown",
                        title: "Unknown step",
                        request: { method: "GET", url: "", headers: {}, body: undefined },
                        response: { ok: false, status: 0, elapsedMs: 0, headers: {}, text: "", json: undefined },
                        extracts: {},
                        assertions: [],
                        passed: false,
                        error: "Step definition is undefined"
                    } satisfies StepResult;
                }

                // Generate dynamic fields (betId, transactionId, reference) before templating
                let generatedFields: Record<string, any> = {};
                if (args.generateFields) {
                    generatedFields = args.generateFields(
                        ctx.input,
                        ctx.context,
                        ctx.vars
                    );
                    // Merge generated fields into ctx.input for template usage
                    ctx.input = { ...ctx.input, ...generatedFields };
                }

                const url = template(stepDef.url, ctx);
                const headers = templateAny(stepDef.headers ?? {}, ctx);
                const mergedHeaders = { ...args.commonHeaders, ...headers };

                const body = stepDef.body === undefined ? undefined : templateAny(stepDef.body, ctx);

                const req = { method: stepDef.method, url, headers: mergedHeaders, body };
                try {
                    const resp = await httpCall(stepDef.method, url, mergedHeaders, body);
                    const extracted = applyExtract(stepDef.extract, resp);

                    // merge extracted vars into ctx.vars namespace
                    Object.assign(ctx.vars, extracted);

                    const assertions = (stepDef.assert ?? []).map((rule) => {
                        const r = evalAssert(rule, ctx, resp, args.responseFields);
                        return { rule, passed: r.passed, message: r.passed ? undefined : (r.message ?? "Assertion failed") };
                    });

                    const passed = assertions.every((a) => a.passed);
                    if (!passed && !firstFailureMessage) {
                        const failedAssertion = assertions.find(a => !a.passed);
                        firstFailureMessage = failedAssertion?.message || "Assertion failed";
                    }

                    return {
                        id: stepDef.id,
                        title: stepDef.title,
                        request: req,
                        response: resp,
                        extracts: extracted,
                        assertions,
                        passed
                    } satisfies StepResult;
                } catch (e: any) {
                    if (!firstFailureMessage) {
                        firstFailureMessage = e?.message ?? String(e);
                    }
                    return {
                        id: stepDef.id,
                        title: stepDef.title,
                        request: req,
                        response: { ok: false, status: 0, elapsedMs: 0, headers: {}, text: "", json: undefined },
                        extracts: {},
                        assertions: [],
                        passed: false,
                        error: e?.message ?? String(e)
                    } satisfies StepResult;
                }
            })
        );

        results.push(...batchResults);
        if (batchResults.some((r) => !r.passed)) allPassed = false;

        // nếu muốn: fail-fast (dừng ngay khi fail)
        // if (!allPassed) break;
    }

    const finishedAt = new Date().toISOString();
    return {
        caseId: args.testCase.id,
        title: args.testCase.title,
        startedAt,
        finishedAt,
        passed: allPassed,
        context: ctx,
        steps: results,
        message: firstFailureMessage
    };
}