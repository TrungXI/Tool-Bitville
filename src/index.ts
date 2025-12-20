import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { t } from "elysia";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { staticPlugin } from "@elysiajs/static";
import { TEST_SUITES } from "./hardcoded/testcases";
import { runTestCase } from "./testRunner";
import { PROVIDERS } from "./hardcoded/providers";
import { ACCOUNTS } from "./hardcoded/accounts";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_change_me";

function nowIso() {
    return new Date().toISOString();
}

async function callDownstream(url: string, headers: Record<string, string>, body: any) {
    const started = Date.now();
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const elapsedMs = Date.now() - started;
    const text = await res.text();
    let json: any = null;
    try {
        json = JSON.parse(text);
    } catch { }
    return { ok: res.ok, status: res.status, elapsedMs, bodyText: text, bodyJson: json };
}

function buildStandardPayload(params: {
    providerKey: string;
    providerInput: Record<string, any>;
}) {
    return {
        provider: params.providerKey,
        meta: { mappedAt: nowIso() },
        data: params.providerInput
    };
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

    // pages
    .get("/", () => Bun.file("public/index.html"))
    .get("/login", () => Bun.file("public/login.html"))
    .get("/app", () => Bun.file("public/app.html"))
    .get("/api/testcases", ({ query, email, set }) => {
        if (!email) { set.status = 401; return { ok: false, message: "Unauthorized" }; }
        const provider = String((query as any).provider ?? "");
        const suite = TEST_SUITES[provider];
        if (!suite) { set.status = 400; return { ok: false, message: "Unknown provider suite" }; }

        // chỉ trả metadata
        return {
            ok: true,
            provider: suite.provider,
            title: suite.title,
            cases: suite.cases.map(c => ({ id: c.id, title: c.title, description: c.description ?? "" }))
        };
    })
    // health
    .get("/api/health", () => ({ ok: true }))

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

        const { provider, caseId, downstreamUrl, providerInput } = body;

        const suite = TEST_SUITES[provider];
        if (!suite) { set.status = 400; return { ok: false, message: "Unknown provider suite" }; }

        const tc = suite.cases.find(c => c.id === caseId);
        if (!tc) { set.status = 404; return { ok: false, message: "Test case not found" }; }

        // build common headers from account provider secret (như bạn đang làm ở /api/test)
        const def = PROVIDERS[provider];
        const account = ACCOUNTS[email];
        const accountProviderCfg = account?.providers?.[provider];
        if (!def || !accountProviderCfg) { set.status = 403; return { ok: false, message: "Provider not enabled for this account" }; }

        const commonHeaders: Record<string, string> = { ...(def.defaultHeaders ?? {}) };
        if (def.standardMap.authType === "bearer") {
            commonHeaders["Authorization"] = `Bearer ${accountProviderCfg[def.standardMap.authField]}`;
        } else if (def.standardMap.authType === "x-header") {
            commonHeaders[def.standardMap.authHeaderName!] = accountProviderCfg[def.standardMap.authField];
        }

        // context vars: downstreamUrl + input.* để template trong testcase dùng
        const context = {
            downstreamUrl,
            input: providerInput,
            email
        };

        const result = await runTestCase({ testCase: tc, context: { ...(suite.baseVars ?? {}), ...context }, commonHeaders });
        return { ok: true, result };
    }, {
        body: t.Object({
            provider: t.String(),
            caseId: t.String(),
            downstreamUrl: t.String({ minLength: 8 }),
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

    // Auth derive: lấy userId + email từ JWT
    .derive(async ({ headers, jwt, set }) => {
        const auth = headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
            return { userId: null as string | null, email: null as string | null };
        }

        const token = auth.slice("Bearer ".length);
        const payload = await jwt.verify(token);

        if (!payload) {
            set.status = 401;
            return { userId: null as string | null, email: null as string | null };
        }

        return {
            userId: String((payload as any).sub),
            email: String((payload as any).email ?? "")
        };
    })

    // Provider list theo account đăng nhập (file cứng)
    .get("/api/providers", ({ email, set }) => {
        if (!email) {
            set.status = 401;
            return { ok: false, message: "Unauthorized" };
        }

        const account = ACCOUNTS[email];
        const providerKeys = account ? Object.keys(account.providers) : [];

        const providers = providerKeys
            .filter((k) => Boolean(PROVIDERS[k]))
            .map((k) => ({
                key: PROVIDERS[k].key,
                label: PROVIDERS[k].label,
                fields: PROVIDERS[k].fields
            }));

        return { ok: true, providers };
    })

    // Test tool (protected) - dùng PROVIDERS + ACCOUNTS (file cứng)
    .post(
        "/api/test",
        async ({ body, userId, email, set }) => {
            if (!userId || !email) {
                set.status = 401;
                return { ok: false, message: "Unauthorized" };
            }

            const { url, provider, providerInput } = body;

            const def = PROVIDERS[provider];
            if (!def) {
                set.status = 400;
                return { ok: false, message: `Unknown provider: ${provider}` };
            }

            const account = ACCOUNTS[email];
            const accountProviderCfg = account?.providers?.[provider];

            if (!accountProviderCfg) {
                set.status = 403;
                return { ok: false, message: `Provider not enabled for this account: ${provider}` };
            }

            // validate required fields
            const missing = def.fields
                .filter((f) => f.required)
                .filter((f) => {
                    const v = providerInput?.[f.key];
                    return v === undefined || v === null || String(v).trim() === "";
                })
                .map((f) => f.key);

            if (missing.length) {
                set.status = 400;
                return { ok: false, message: "Missing required fields", missing };
            }

            // build standard payload (chuẩn hoá)
            const standardPayload = buildStandardPayload({
                providerKey: def.key,
                providerInput
            });

            // headers + auth từ accountProviderCfg
            const headers: Record<string, string> = {
                ...(def.defaultHeaders ?? {})
            };

            if (def.standardMap.authType === "bearer") {
                headers["Authorization"] = `Bearer ${accountProviderCfg[def.standardMap.authField]}`;
            } else if (def.standardMap.authType === "x-header") {
                headers[def.standardMap.authHeaderName!] = accountProviderCfg[def.standardMap.authField];
            }

            const downstream = await callDownstream(url, headers, standardPayload);

            return {
                ok: true,
                providerDef: { key: def.key, label: def.label },
                standardPayload,
                downstream
            };
        },
        {
            body: t.Object({
                url: t.String({ minLength: 8 }),
                provider: t.String({ minLength: 2 }),
                providerInput: t.Record(t.String(), t.Any())
            })
        }
    )

    .listen(3000);

console.log(`✅ http://localhost:${app.server?.port}`);