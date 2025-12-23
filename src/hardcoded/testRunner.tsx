// import type {
//     AssertRule,
//     ExtractRule,
//     StepDef,
//     TestCaseDef
// } from "./testcases/_types";

// export type AssertionResult = {
//     passed: boolean;
//     message: string;
//     rule: AssertRule;
// };

// export type StepResult = {
//     id: string;
//     title: string;
//     passed: boolean;
//     errorMessage?: string;

//     request: {
//         method: string;
//         url: string;
//         headers: Record<string, string>;
//         body?: any;
//     };

//     response: {
//         ok: boolean;
//         status: number;
//         elapsedMs: number;
//         headers: Record<string, string>;
//         text: string;
//         json?: any;
//     };

//     extracts: Record<string, any>;
//     assertions: AssertionResult[];
// };

// export type CaseRunResult = {
//     caseId: string;
//     title: string;
//     expected?: string;
//     passed: boolean;
//     startedAt: string;
//     finishedAt: string;
//     steps: StepResult[];
//     // optional: aggregated message for collapsed card header
//     message?: string;
// };

// type RunnerContext = {
//     context: Record<string, any>; // left inputs
//     input: Record<string, any>;   // provider inputs
//     vars: Record<string, any>;    // runtime extracted
//     // additional allowed keys
//     [k: string]: any;
// };

// function deepGet(obj: any, path: string): any {
//     if (!path) return undefined;
//     return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
// }

// function toStr(v: any) {
//     if (v === undefined || v === null) return "";
//     return String(v);
// }

// // replace {{context.x}} {{input.x}} {{vars.x}}
// function templateStr(str: string, ctx: RunnerContext): string {
//     return str.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
//         const key = String(expr).trim(); // e.g. context.url
//         const v = deepGet(ctx, key);
//         return toStr(v);
//     });
// }

// function templateAny(v: any, ctx: RunnerContext): any {
//     if (typeof v === "string") return templateStr(v, ctx);
//     if (Array.isArray(v)) return v.map((x) => templateAny(x, ctx));
//     if (v && typeof v === "object") {
//         const out: any = {};
//         for (const [k, val] of Object.entries(v)) out[k] = templateAny(val, ctx);
//         return out;
//     }
//     return v;
// }

// async function httpCall(method: string, url: string, headers: Record<string, string>, body?: any) {
//     const started = Date.now();

//     const res = await fetch(url, {
//         method,
//         headers,
//         body: body === undefined ? undefined : JSON.stringify(body)
//     });

//     const elapsedMs = Date.now() - started;
//     const text = await res.text();

//     let json: any = undefined;
//     try {
//         json = JSON.parse(text);
//     } catch { }

//     return {
//         ok: res.ok,
//         status: res.status,
//         elapsedMs,
//         headers: Object.fromEntries(res.headers.entries()),
//         text,
//         json
//     };
// }

// function applyExtract(extract: ExtractRule[] | undefined, resp: { text: string; json?: any }) {
//     const out: Record<string, any> = {};
//     for (const ex of extract ?? []) {
//         if (ex.from === "text") {
//             out[ex.var] = resp.text;
//             continue;
//         }
//         // json
//         out[ex.var] = ex.path ? deepGet(resp.json, ex.path) : resp.json;
//     }
//     return out;
// }

// function assertToMessage(rule: AssertRule, actual: any) {
//     // for UI: "Expected ... / Actual ..."
//     if (rule.type === "status_in") {
//         return `Expected status in ${JSON.stringify(rule.expected)}; Actual ${JSON.stringify(actual)}`;
//     }
//     if (rule.type === "json_path_eq") {
//         return `Expected ${rule.path} == ${JSON.stringify(rule.expected)}; Actual ${JSON.stringify(actual)}`;
//     }
//     if (rule.type === "json_path_in") {
//         return `Expected ${rule.path} in ${JSON.stringify(rule.expected)}; Actual ${JSON.stringify(actual)}`;
//     }
//     if (rule.type === "json_path_exists") {
//         return `Expected ${rule.path} exists; Actual ${actual === undefined ? "missing" : "exists"}`;
//     }
//     if (rule.type === "equals_var") {
//         return `Expected var ${rule.var} == ${JSON.stringify(rule.expected)}; Actual ${JSON.stringify(actual)}`;
//     }
//     if (rule.type === "custom") {
//         return `Custom(${rule.name}) -> ${JSON.stringify(actual)}`;
//     }
//     return `Assert -> ${JSON.stringify(actual)}`;
// }

// function evalAssert(rule: AssertRule, ctx: RunnerContext, resp: { status: number; json?: any; text: string }): AssertionResult {
//     // This function always returns AssertionResult, but TypeScript needs explicit return in all paths
//     const ok = (message: string): AssertionResult => ({ passed: true, message, rule });
//     const fail = (message: string): AssertionResult => ({ passed: false, message, rule });

//     switch (rule.type) {
//         case "status_in": {
//             const actual = resp.status;
//             const passed = rule.expected.includes(actual);
//             return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//         }

//         case "json_path_eq": {
//             const actual = deepGet(resp.json, rule.path);
//             const passed = actual === rule.expected;
//             return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//         }

//         case "json_path_in": {
//             const actual = deepGet(resp.json, rule.path);
//             const passed = rule.expected.includes(actual);
//             return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//         }

//         case "json_path_exists": {
//             const actual = deepGet(resp.json, rule.path);
//             const passed = actual !== undefined;
//             return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//         }

//         case "equals_var": {
//             const actual = ctx.vars?.[rule.var] ?? deepGet(ctx, rule.var);
//             const passed = actual === rule.expected;
//             return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//         }

//         case "custom": {
//             // You can expand custom rules here (business logic)
//             if (rule.name === "non_empty") {
//                 const path = rule.params?.path as string | undefined;
//                 const actual = path ? deepGet(resp.json, path) : resp.json;
//                 const passed = !(actual === undefined || actual === null || String(actual).trim() === "");
//                 return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//             }

//             if (rule.name === "debit_credit_cancel") {
//                 // example: response.status not in ["error","invalid","failed"] OR err code must be 0/1 if exists
//                 const status = deepGet(resp.json, "status");
//                 const err = deepGet(resp.json, "err");

//                 const badStatus = ["error", "invalid", "failed"];
//                 const statusBad = status && badStatus.includes(String(status).toLowerCase());
//                 const errBad = err !== undefined && ![0, 1].includes(err);

//                 const passed = !statusBad && !errBad;
//                 const actual = { status, err };
//                 return passed ? ok(assertToMessage(rule, actual)) : fail(assertToMessage(rule, actual));
//             }

//             return fail(`Unknown custom rule: ${rule.name}`);
//         }
//         default: {
//             // TypeScript exhaustiveness check - should never reach here
//             return fail(`Unknown assertion type: ${(rule as any).type}`);
//         }
//     }
// }

// function buildIdMap(steps: StepDef[]) {
//     const map = new Map<string, StepDef>();
//     for (const s of steps) {
//         if (map.has(s.id)) throw new Error(`Duplicate step id: ${s.id}`);
//         map.set(s.id, s);
//     }
//     return map;
// }

// function depsSatisfied(step: StepDef, finished: Set<string>) {
//     for (const dep of step.dependsOn ?? []) {
//         if (!finished.has(dep)) return false;
//     }
//     return true;
// }

// /**
//  * Scheduler:
//  * - bước nào depsSatisfied -> eligible
//  * - nếu step có parallelGroup: chạy chung tất cả eligible cùng group trong 1 batch (Promise.all)
//  * - nếu không: chạy tuần tự từng step
//  */
// export async function runCase(args: {
//     testCase: TestCaseDef;
//     context: RunnerContext;
//     commonHeaders?: Record<string, string>;
//     failFast?: boolean; // default false
// }): Promise<CaseRunResult> {
//     const startedAt = new Date().toISOString();

//     const ctx: RunnerContext = {
//         context: args.context?.context ?? {},
//         input: args.context?.input ?? {},
//         vars: args.context?.vars ?? {}
//     };

//     const commonHeaders = args.commonHeaders ?? {};
//     const map = buildIdMap(args.testCase.steps);

//     const pending = new Set<string>(args.testCase.steps.map((s: StepDef) => s.id));
//     const finished = new Set<string>();
//     const results: StepResult[] = [];

//     let casePassed = true;

//     // loop until no pending
//     while (pending.size > 0) {
//         // collect eligible
//         const eligible: StepDef[] = [];
//         for (const id of pending) {
//             const step = map.get(id);
//             if (step && depsSatisfied(step, finished)) eligible.push(step);
//         }

//         if (eligible.length === 0) {
//             // deadlock: dependency missing or cycle
//             const remain = [...pending];
//             throw new Error(`Cannot resolve dependencies. Remaining steps: ${remain.join(", ")}`);
//         }

//         // group eligible by parallelGroup
//         // pick one group to execute now:
//         // - if any parallelGroup exists -> execute that whole group
//         // - else execute first eligible step
//         const firstWithGroup = eligible.find((s) => s.parallelGroup);
//         let batch: StepDef[];

//         if (firstWithGroup?.parallelGroup) {
//             const g = firstWithGroup.parallelGroup;
//             batch = eligible.filter((s) => s.parallelGroup === g);
//         } else {
//             const firstStep = eligible[0];
//             if (!firstStep) throw new Error("No eligible step found");
//             batch = [firstStep];
//         }

//         // execute batch
//         const batchRes = await Promise.all(
//             batch.map(async (step) => {
//                 const reqUrl = templateStr(step.url, ctx);
//                 const reqHeaders = templateAny(step.headers ?? {}, ctx);
//                 const reqBody = step.body === undefined ? undefined : templateAny(step.body, ctx);

//                 const headers: Record<string, string> = { ...commonHeaders, ...reqHeaders };

//                 const request = { method: step.method, url: reqUrl, headers, body: reqBody };

//                 try {
//                     const resp = await httpCall(step.method, reqUrl, headers, reqBody);

//                     // extract
//                     const extracts = applyExtract(step.extract, resp);
//                     Object.assign(ctx.vars, extracts);

//                     // assert
//                     const assertions = (step.assert ?? []).map((rule: AssertRule) => evalAssert(rule, ctx, resp));
//                     const passed = assertions.every((a: AssertionResult) => a.passed);

//                     return {
//                         id: step.id,
//                         title: step.title,
//                         passed,
//                         request,
//                         response: resp,
//                         extracts,
//                         assertions
//                     } satisfies StepResult;
//                 } catch (e: any) {
//                     return {
//                         id: step.id,
//                         title: step.title,
//                         passed: false,
//                         errorMessage: e?.message ?? String(e),
//                         request,
//                         response: { ok: false, status: 0, elapsedMs: 0, headers: {}, text: "", json: undefined },
//                         extracts: {},
//                         assertions: [{ passed: false, message: e?.message ?? String(e), rule: { type: "custom", name: "non_empty" } as any }]
//                     } satisfies StepResult;
//                 }
//             })
//         );

//         // commit batch results
//         for (const r of batchRes) {
//             results.push(r);
//             pending.delete(r.id);
//             finished.add(r.id);

//             if (!r.passed) casePassed = false;
//         }

//         if (args.failFast && !casePassed) break;
//     }

//     const finishedAt = new Date().toISOString();

//     // collapsed message for UI card
//     let message: string | undefined = undefined;
//     if (!casePassed) {
//         const firstFailStep = results.find((s) => !s.passed);
//         const firstFailAssert = firstFailStep?.assertions?.find((a) => !a.passed);
//         message =
//             firstFailAssert?.message ||
//             firstFailStep?.errorMessage ||
//             "Failed";
//     } else {
//         message = "Success";
//     }

//     return {
//         caseId: args.testCase.id,
//         title: args.testCase.title,
//         expected: args.testCase.expected,
//         passed: casePassed,
//         startedAt,
//         finishedAt,
//         steps: results,
//         message
//     };
// }