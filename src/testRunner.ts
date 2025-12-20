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

function evalAssert(rule: AssertRule, ctx: Record<string, any>, resp: { status: number; json?: any; text: string }) {
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

        case "equals": {
            const actual = ctx[rule.actualVar];
            return actual === rule.expected
                ? pass()
                : fail(`var ${rule.actualVar} expected=${JSON.stringify(rule.expected)} actual=${JSON.stringify(actual)}`);
        }

        case "custom": {
            if (rule.name === "debit_credit_cancel") {
                // Example logic check: debitStatus2 không được là invalid, hoặc cancel thì không được success...
                const status = deepGet(resp.json, "status");
                const ok = ["created", "pending", "success", "cancelled", "canceled"].includes(status);
                return ok ? pass() : fail(`custom debit_credit_cancel failed: status=${status}`);
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
    context: Record<string, any>; // includes downstreamUrl, input, auth headers computed earlier
    commonHeaders: Record<string, string>;
}): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    const ctx: Record<string, any> = { ...args.context };
    const stepsOrdered = topoSortSteps(args.testCase.steps);

    const results: StepResult[] = [];
    let allPassed = true;

    // handle parallel groups: execute sequentially by default, but if steps share same parallelGroup, run them together
    for (let i = 0; i < stepsOrdered.length;) {
        const s = stepsOrdered[i];
        const group = s.parallelGroup;

        const batch: StepDef[] = [];
        if (group) {
            while (i < stepsOrdered.length && stepsOrdered[i].parallelGroup === group) {
                batch.push(stepsOrdered[i]);
                i++;
            }
        } else {
            batch.push(s);
            i++;
        }

        const batchResults = await Promise.all(
            batch.map(async (step) => {
                const url = template(step.url, ctx);
                const headers = templateAny(step.headers ?? {}, ctx);
                const mergedHeaders = { ...args.commonHeaders, ...headers };

                const body = step.body === undefined ? undefined : templateAny(step.body, ctx);

                const req = { method: step.method, url, headers: mergedHeaders, body };
                try {
                    const resp = await httpCall(step.method, url, mergedHeaders, body);
                    const extracted = applyExtract(step.extract, resp);

                    // merge extracted vars into ctx
                    Object.assign(ctx, extracted);

                    const assertions = (step.assert ?? []).map((rule) => {
                        const r = evalAssert(rule, ctx, resp);
                        return { rule, passed: r.passed, message: r.message };
                    });

                    const passed = assertions.every((a) => a.passed);
                    return {
                        id: step.id,
                        title: step.title,
                        request: req,
                        response: resp,
                        extracts: extracted,
                        assertions,
                        passed
                    } satisfies StepResult;
                } catch (e: any) {
                    return {
                        id: step.id,
                        title: step.title,
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
        steps: results
    };
}