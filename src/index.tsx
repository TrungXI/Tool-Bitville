import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { t } from "elysia";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { staticPlugin } from "@elysiajs/static";
import { runTestCase } from "./testRunner";
import { PROVIDERS, TEST_SUITES } from "./hardcoded/providers";
import { ACCOUNTS, getAccountModel } from "./hardcoded/accounts";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

if (!process.env.JWT_SECRET) {
    console.warn("⚠️  JWT_SECRET not set, using default. Please set JWT_SECRET in production!");
}

const app = new Elysia()
    .use(cors())
    .use(jwt({ name: "jwt", secret: JWT_SECRET }))
    .use(
        staticPlugin({
            assets: "public",
            prefix: "/"
        })
    )

    // Auth derive: lấy userId + email từ JWT
    .derive(async ({ headers, jwt, set }) => {
        const auth = headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
            return { userId: null as string | null, email: null as string | null };
        }

        const token = auth.slice("Bearer ".length);
        const payload = await jwt.verify(token);

        if (!payload) {
            return { userId: null as string | null, email: null as string | null };
        }

        return {
            userId: String((payload as any).sub),
            email: String((payload as any).email ?? "")
        };
    })

    // pages
    .get("/", async () => {
        const file = Bun.file("public/index.html");
        return new Response(await file.text(), {
            headers: { "Content-Type": "text/html" }
        });
    })
    .get("/login", async () => {
        const file = Bun.file("public/login.html");
        return new Response(await file.text(), {
            headers: { "Content-Type": "text/html" }
        });
    })
    .get("/app", async () => {
        const file = Bun.file("public/app.html");
        return new Response(await file.text(), {
            headers: { "Content-Type": "text/html" }
        });
    })
    // Transpile TSX files using Bun's bundler (bundle React into output)
    .get("/app.tsx", async ({ set }) => {
        try {
            const result = await Bun.build({
                entrypoints: ["public/app.tsx"],
                target: "browser",
                format: "esm",
                minify: false,
                sourcemap: "inline"
                // Don't externalize React - bundle it in
            });

            if (!result.success) {
                const errorMsg = result.logs.map(log => `${log.level}: ${log.message}`).join("\n");
                console.error("Build failed:", errorMsg);
                return new Response(`// Build failed\nconsole.error(${JSON.stringify(errorMsg)});`, {
                    status: 200,
                    headers: { "Content-Type": "application/javascript; charset=utf-8" }
                });
            }

            let output = await result.outputs[0]?.text() || "";

            // Remove CSS import (CSS is loaded via <link> tag in HTML)
            output = output.replace(
                /import\s+['"]\.\/app\.css['"];?/g,
                ""
            );

            return new Response(output, {
                headers: {
                    "Content-Type": "application/javascript; charset=utf-8"
                }
            });
        } catch (error: any) {
            console.error("Error building TSX:", error);
            return new Response(`// Error: ${error.message}\nconsole.error(${JSON.stringify(error.message)});`, {
                status: 200,
                headers: { "Content-Type": "application/javascript; charset=utf-8" }
            });
        }
    })
    .get("/api/testcases", ({ query, email, set }) => {
        if (!email) { set.status = 401; return { ok: false, message: "Unauthorized" }; }
        const provider = String((query as any).provider ?? "");
        const suite = TEST_SUITES[provider as keyof typeof TEST_SUITES];
        if (!suite) { set.status = 400; return { ok: false, message: "Unknown provider suite" }; }

        // Check account has access to this provider
        const account = ACCOUNTS[email];
        if (!account?.providers[provider]) {
            set.status = 403;
            return { ok: false, message: "Provider not enabled for this account" };
        }

        // chỉ trả metadata
        return {
            ok: true,
            provider: suite.provider,
            title: suite.title,
            cases: suite.cases.map((c: any) => ({ id: c.id, title: c.title, expected: (c as any).expected ?? "" }))
        };
    })
    // health
    .get("/api/health", async () => {
        const r = await sql`select now() as now`;
        return r[0];
    })

    // Register user (DB)
    .post(
        "/api/auth/register",
        async ({ body, set }) => {
            const { email, password } = body;
            const passwordHash = await bcrypt.hash(password, 10);

            try {
                const [u] = await sql`
          insert into users(email, password_hash)
          values (${email}, ${passwordHash})
          returning id, email
        `;
                return { ok: true, user: u };
            } catch {
                set.status = 409;
                return { ok: false, message: "Email already exists" };
            }
        },
        {
            body: t.Object({ email: t.String(), password: t.String({ minLength: 6 }) })
        }
    )
    .post("/api/run-case", async ({ body, email, set }) => {
        if (!email) { set.status = 401; return { ok: false, message: "Unauthorized" }; }

        const { provider, caseId, context, providerInput } = body;

        const suite = TEST_SUITES[provider as keyof typeof TEST_SUITES];
        if (!suite) { set.status = 400; return { ok: false, message: "Unknown provider suite" }; }

        const tc = suite.cases.find(c => c.id === caseId);
        if (!tc) { set.status = 404; return { ok: false, message: "Test case not found" }; }

        // Check account has access to this provider
        const account = ACCOUNTS[email];
        if (!account?.providers[provider]) {
            set.status = 403;
            return { ok: false, message: "Provider not enabled for this account" };
        }

        // Common headers - using SecretKey from context
        const commonHeaders: Record<string, string> = {
            "Content-Type": "application/json"
        };
        if (context.secretKey) {
            commonHeaders["SecretKey"] = context.secretKey;
        }

        // Get provider config for response field mappings and field generator
        const providerDef = PROVIDERS[provider];
        const responseFields = providerDef?.responseFields;
        const generateFields = providerDef?.generateFields;

        // Build context structure for testRunner
        const testContext = {
            context: context,
            providerInput: providerInput
        };

        const result = await runTestCase({
            testCase: tc,
            context: testContext,
            commonHeaders,
            responseFields,
            generateFields
        });
        return { ok: true, result: { ...result, expected: (tc as any).expected ?? "" } };
    }, {
        body: t.Object({
            provider: t.String(),
            caseId: t.String(),
            context: t.Record(t.String(), t.Any()),
            providerInput: t.Record(t.String(), t.Any())
        })
    })
    .post("/api/run-all", async ({ body, email, set }) => {
        if (!email) { set.status = 401; return { ok: false, message: "Unauthorized" }; }

        const { provider, context, providerInput } = body;

        const suite = TEST_SUITES[provider as keyof typeof TEST_SUITES];
        if (!suite) { set.status = 400; return { ok: false, message: "Unknown provider suite" }; }

        // Check account has access to this provider
        const account = ACCOUNTS[email];
        if (!account?.providers[provider]) {
            set.status = 403;
            return { ok: false, message: "Provider not enabled for this account" };
        }

        // Common headers - using SecretKey from context
        const commonHeaders: Record<string, string> = {
            "Content-Type": "application/json"
        };
        if (context.secretKey) {
            commonHeaders["SecretKey"] = context.secretKey;
        }

        // Get provider config for response field mappings and field generator
        const providerDef = PROVIDERS[provider];
        const responseFields = providerDef?.responseFields;
        const generateFields = providerDef?.generateFields;

        // Build context structure for testRunner
        const testContext = {
            context: context,
            providerInput: providerInput
        };

        // Run all testcases sequentially (one after another)
        // Stop immediately if any test case fails
        const results = [];
        for (const tc of suite.cases) {
            const result = await runTestCase({
                testCase: tc,
                context: testContext,
                commonHeaders,
                responseFields,
                generateFields
            });
            results.push({ ...result, expected: (tc as any).expected ?? "" });

            // Stop if test case failed
            if (!result.passed) {
                break;
            }
        }

        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        const failed = total - passed;

        return {
            ok: true,
            summary: { total, passed, failed },
            results
        };
    }, {
        body: t.Object({
            provider: t.String(),
            context: t.Record(t.String(), t.Any()),
            providerInput: t.Record(t.String(), t.Any())
        })
    })
    // Login JWT (DB)
    .post(
        "/api/auth/login",
        async ({ body, jwt, set }) => {
            const { email, password } = body;

            const users = await sql`
        select id, email, password_hash
        from users
        where email=${email}
        limit 1
      `;
            const user = users[0];

            if (!user) {
                set.status = 401;
                return { ok: false, message: "Invalid credentials" };
            }

            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) {
                set.status = 401;
                return { ok: false, message: "Invalid credentials" };
            }

            const token = await jwt.sign({ sub: user.id, email: user.email });
            return { ok: true, token };
        },
        {
            body: t.Object({ email: t.String(), password: t.String() })
        }
    )

    // Provider list theo account đăng nhập (file cứng)
    // Sử dụng AccountModel để lấy list providers
    .get("/api/providers", ({ email, set }) => {
        if (!email) {
            set.status = 401;
            return { ok: false, message: "Unauthorized" };
        }

        // Get AccountModel để lấy list providers
        const accountModel = getAccountModel(email);
        if (!accountModel) {
            return { ok: true, providers: [] };
        }

        const account = ACCOUNTS[email];
        const providers = accountModel.providers
            .filter((k) => Boolean(PROVIDERS[k]))
            .map((k) => {
                const p = PROVIDERS[k];
                if (!p) return null;
                const accountProvider = account?.providers[k];
                return {
                    key: p.key,
                    label: p.label,
                    fields: p.fields,
                    contextFields: p.contextFields,
                    // Include default values for this account + provider
                    defaults: accountProvider?.inputDefaults || {},
                    contextDefaults: accountProvider?.contextDefaults || {}
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

        return { ok: true, providers };
    });
// Export app for Vercel serverless function
export default app;

