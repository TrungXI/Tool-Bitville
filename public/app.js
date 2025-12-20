const token = localStorage.getItem("token");
if (!token) location.href = "/login";

document.getElementById("goLogin").onclick = () => (location.href = "/login");
document.getElementById("logout").onclick = () => {
    localStorage.removeItem("token");
    location.href = "/login";
};

const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const providerSel = document.getElementById("provider");
const providerFieldsEl = document.getElementById("providerFields");

const runBtn = document.getElementById("runAll");
const clearBtn = document.getElementById("clear");

const suiteTitleEl = document.getElementById("suiteTitle");
const resultsEl = document.getElementById("results");

const filterSel = document.getElementById("filter");
const exportBtn = document.getElementById("export");

const kpiTotal = document.getElementById("kpi_total");
const kpiPass = document.getElementById("kpi_pass");
const kpiFail = document.getElementById("kpi_fail");
const donut = document.getElementById("donut");

let providers = []; // from /api/providers (per account)
let currentProvider = null; // provider def {key,label,fields}
let providerInput = {}; // dynamic form values
let lastRun = null; // last run-all response

function setStatus(msg) {
    statusEl.textContent = msg;
}
function pretty(x) {
    return JSON.stringify(x, null, 2);
}

async function api(path, options = {}) {
    const res = await fetch(path, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
}

function ctx() {
    return {
        url: document.getElementById("ctx_url").value.trim(),
        operatorId: document.getElementById("ctx_operatorId").value.trim(),
        secretKey: document.getElementById("ctx_secretKey").value.trim(),
        token: document.getElementById("ctx_token").value.trim(),
        providerId: document.getElementById("ctx_providerId").value.trim(),
        playerId: document.getElementById("ctx_playerId").value.trim(),
        currencyId: document.getElementById("ctx_currencyId").value.trim(),
        gameId: document.getElementById("ctx_gameId").value.trim(),
        bonusTicketId: document.getElementById("ctx_bonusTicketId").value.trim(),
    };
}

function validate() {
    const c = ctx();
    const requiredCtx = [
        "url",
        "operatorId",
        "secretKey",
        "token",
        "providerId",
        "playerId",
        "currencyId",
        "gameId",
    ];
    const missingCtx = requiredCtx.filter((k) => !c[k]);
    if (missingCtx.length)
        return { ok: false, msg: `Missing required context: ${missingCtx.join(", ")}` };

    if (!currentProvider) return { ok: false, msg: "No provider selected" };

    const missingProvider = (currentProvider.fields || [])
        .filter((f) => f.required)
        .filter((f) => {
            const v = providerInput[f.key];
            return v === undefined || v === null || String(v).trim() === "";
        })
        .map((f) => f.key);

    if (missingProvider.length)
        return { ok: false, msg: `Missing required inputs: ${missingProvider.join(", ")}` };

    return { ok: true, msg: "Ready" };
}

function updateRunBtn() {
    const v = validate();
    runBtn.disabled = !v.ok;
    hintEl.textContent = v.ok ? "" : v.msg;
}

function renderProviderFields(p) {
    providerFieldsEl.innerHTML = "";
    providerInput = {};

    if (!p) return;

    const title = document.createElement("div");
    title.className = "muted";
    title.textContent = "Provider Inputs";
    providerFieldsEl.appendChild(title);

    (p.fields || []).forEach((f) => {
        const wrap = document.createElement("div");
        wrap.style.marginTop = "10px";

        const label = document.createElement("label");
        label.textContent = f.label || f.key;
        if (f.required) {
            const s = document.createElement("span");
            s.className = "req";
            s.textContent = "*";
            label.appendChild(s);
        }

        const input = document.createElement("input");
        input.placeholder = f.placeholder || "";
        input.id = `p_${f.key}`;

        input.addEventListener("input", () => {
            providerInput[f.key] = input.value;
            updateRunBtn();
        });

        wrap.appendChild(label);
        wrap.appendChild(input);
        providerFieldsEl.appendChild(wrap);

        providerInput[f.key] = "";
    });

    updateRunBtn();
}

function setSummary(total, passed, failed) {
    kpiTotal.textContent = `Result (${total})`;
    kpiPass.textContent = `Passed Test - ${passed}`;
    kpiFail.textContent = `Failed Test - ${failed}`;

    const pct = total ? Math.round((passed / total) * 100) : 0;
    donut.style.setProperty("--deg", `${Math.round((pct / 100) * 360)}deg`);
}

function matchFilter(caseRun) {
    const f = filterSel.value;
    if (f === "all") return true;
    if (f === "pass") return caseRun.passed === true;
    if (f === "fail") return caseRun.passed === false;
    return true;
}

function renderResults(runAllPayload) {
    resultsEl.innerHTML = "";

    if (!runAllPayload) {
        setSummary(0, 0, 0);
        suiteTitleEl.textContent = "";
        return;
    }

    const { summary, results } = runAllPayload;
    setSummary(summary.total, summary.passed, summary.failed);

    const show = (results || []).filter(matchFilter);

    suiteTitleEl.textContent = `Provider suite: ${currentProvider?.label || currentProvider?.key || ""}`;

    show.forEach((cr) => {
        const card = document.createElement("div");
        card.className = "caseCard";

        const head = document.createElement("div");
        head.className = "caseHead";

        const left = document.createElement("div");
        const h4 = document.createElement("h4");
        h4.textContent = cr.title;

        const msg = document.createElement("div");
        msg.className = "caseMsg";
        msg.textContent = cr.expected ? `Expected: ${cr.expected}` : "";

        left.appendChild(h4);
        left.appendChild(msg);

        const right = document.createElement("div");
        const badge = document.createElement("span");
        badge.className = `badge ${cr.passed ? "pass" : "fail"}`;
        badge.textContent = cr.passed ? "PASS" : "FAIL";
        right.appendChild(badge);

        head.appendChild(left);
        head.appendChild(right);

        const body = document.createElement("div");
        body.className = "caseBody";

        (cr.steps || []).forEach((st) => {
            const s = document.createElement("div");
            s.className = "step";

            const top = document.createElement("div");
            top.className = "stepTop";

            const t = document.createElement("b");
            t.textContent = st.title;

            const meta = document.createElement("div");
            meta.className = "muted";
            meta.textContent = `${st.passed ? "✅" : "❌"} ${st.response?.status ?? 0} • ${st.response?.elapsedMs ?? 0}ms`;

            top.appendChild(t);
            top.appendChild(meta);

            // request blocks
            const reqBox = document.createElement("div");
            reqBox.className = "row2";

            const req1 = document.createElement("div");
            req1.innerHTML = `<div class="muted"><b>Request URL</b></div>`;
            const preUrl = document.createElement("pre");
            preUrl.textContent = `${st.request.method} ${st.request.url}`;
            req1.appendChild(preUrl);

            const req2 = document.createElement("div");
            req2.innerHTML = `<div class="muted"><b>Request Headers</b></div>`;
            const preHeaders = document.createElement("pre");
            preHeaders.textContent = pretty(st.request.headers || {});
            req2.appendChild(preHeaders);

            reqBox.appendChild(req1);
            reqBox.appendChild(req2);

            // request data + response data
            const dataBox = document.createElement("div");
            dataBox.className = "row2";

            const d1 = document.createElement("div");
            d1.innerHTML = `<div class="muted"><b>Request Data</b></div>`;
            const preReq = document.createElement("pre");
            preReq.textContent = pretty(st.request.body ?? {});
            d1.appendChild(preReq);

            const d2 = document.createElement("div");
            d2.innerHTML = `<div class="muted"><b>Response Data</b></div>`;
            const preResp = document.createElement("pre");
            preResp.textContent = st.response?.json ? pretty(st.response.json) : (st.response?.text ?? "");
            d2.appendChild(preResp);

            dataBox.appendChild(d1);
            dataBox.appendChild(d2);

            // assertions
            const aWrap = document.createElement("div");
            aWrap.style.marginTop = "8px";
            aWrap.innerHTML = `<div class="muted"><b>Assertions</b></div>`;

            const preA = document.createElement("pre");
            preA.textContent = pretty(
                (st.assertions || []).map((a) => ({
                    passed: a.passed,
                    message: a.message,
                    rule: a.rule,
                }))
            );
            aWrap.appendChild(preA);

            if (st.errorMessage) {
                const err = document.createElement("pre");
                err.textContent = `Error: ${st.errorMessage}`;
                aWrap.appendChild(err);
            }

            s.appendChild(top);
            s.appendChild(reqBox);
            s.appendChild(dataBox);
            s.appendChild(aWrap);

            body.appendChild(s);
        });

        head.onclick = () => {
            body.classList.toggle("open");
        };

        card.appendChild(head);
        card.appendChild(body);
        resultsEl.appendChild(card);
    });
}

function bindCtxValidation() {
    const ids = [
        "ctx_url",
        "ctx_operatorId",
        "ctx_secretKey",
        "ctx_token",
        "ctx_providerId",
        "ctx_playerId",
        "ctx_currencyId",
        "ctx_gameId",
        "ctx_bonusTicketId",
    ];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener("input", updateRunBtn);
    });
}

function exportJson() {
    if (!lastRun) return;

    const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `test-results-${currentProvider?.key || "provider"}-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

async function loadProviders() {
    setStatus("Loading providers...");
    const { res, data } = await api("/api/providers");

    if (!res.ok) {
        setStatus("Failed to load providers");
        resultsEl.innerHTML = `<pre>${pretty({ status: res.status, ...data })}</pre>`;
        return;
    }

    providers = data.providers || [];
    providerSel.innerHTML = "";
    providers.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.key;
        opt.textContent = p.label ? `${p.label} (${p.key})` : p.key;
        providerSel.appendChild(opt);
    });

    currentProvider = providers[0] || null;
    if (currentProvider) providerSel.value = currentProvider.key;
    renderProviderFields(currentProvider);

    providerSel.onchange = () => {
        currentProvider = providers.find((x) => x.key === providerSel.value) || null;
        lastRun = null;
        renderResults(null);
        renderProviderFields(currentProvider);
    };

    setStatus("Ready");
    updateRunBtn();
}

runBtn.onclick = async () => {
    const v = validate();
    if (!v.ok) return;

    setStatus("Running...");
    runBtn.disabled = true;

    const payload = {
        provider: currentProvider.key,
        context: ctx(),
        providerInput,
    };

    const { res, data } = await api("/api/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    runBtn.disabled = false;

    if (!res.ok) {
        setStatus("Run failed");
        resultsEl.innerHTML = `<pre>${pretty({ status: res.status, ...data })}</pre>`;
        return;
    }

    lastRun = data;
    renderResults(data);
    setStatus("Done");
};

clearBtn.onclick = () => {
    // you can adjust defaults here
    document.getElementById("ctx_bonusTicketId").value = "";
    providerFieldsEl.querySelectorAll("input").forEach((i) => (i.value = ""));
    for (const k of Object.keys(providerInput)) providerInput[k] = "";
    lastRun = null;
    renderResults(null);
    updateRunBtn();
};

filterSel.onchange = () => {
    renderResults(lastRun);
};

exportBtn.onclick = exportJson;

bindCtxValidation();
loadProviders();