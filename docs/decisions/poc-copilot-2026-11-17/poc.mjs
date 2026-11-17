// FeatherSpec Studio - authenticated Copilot SDK PoC (ADR-003 §7 A, spec 0010 §13 M-01..M-09).
// Non-interactive. Every check runs in try/catch with a timeout. Whole run < 4 min. Exit code 0.
// Output: events-copilot.jsonl (one normalized, redacted line per event) and report.json.
// Usage: node poc.mjs [--runtime=auto|installed|bundled]   (default auto: installed CLI on PATH, else bundled)
import { appendFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const T0 = Date.now();
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRATCH = join(HERE, "scratch");
const PROBE_HOME = join(HERE, "probe-copilot-home"); // M-08 only; outside scratch
const EVENTS_FILE = join(HERE, "events-copilot.jsonl");
const REPORT_FILE = join(HERE, "report.json");
const HOME = homedir();
const isWin = process.platform === "win32";
const DEADLINE = T0 + 220_000; // work stops here; report is written by 230 s; hard exit at 236 s
const RESERVE_MS = 8_000;
const SDK_EXPECTS_CLI = "1.0.112"; // dist/cliVersion.js of @github/copilot-sdk 1.0.34
const SDK_PROTOCOL_VERSION = 3; // dist/sdkProtocolVersion.d.ts of 1.0.34
const PROMPTS = {
  p1: "Reply with the single word: ok. Do not use any tools.",
  p2: "Create a file named hello.txt in the current working directory containing the single line: hello. Use your file creation tool.",
  p3: "Write the numbers from one to four hundred in English words, one per line. Do not use any tools.",
  p4: "What single word did you reply with to my first message in this session? Reply with that word only. Do not use any tools.",
};
const DENY_FEEDBACK = "Denied by the FeatherSpec Studio PoC (deny-all handler).";

// ---------- redaction & recording ----------
const masks = [];
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function redact(v, max = 200) {
  if (v === undefined || v === null) return v;
  let s = typeof v === "string" ? v : String(v);
  s = s
    .replace(/\b(gh[opusr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,})/g, "[REDACTED_TOKEN]")
    .replace(/(bearer|token)(\s*[:=]?\s*)[A-Za-z0-9._-]{16,}/gi, "$1$2[REDACTED]");
  for (const m of masks) if (m) s = s.replace(new RegExp(escapeRe(m), "gi"), "[LOGIN]");
  if (HOME) for (const h of new Set([HOME, HOME.replace(/\\/g, "/")])) s = s.replace(new RegExp(escapeRe(h), isWin ? "gi" : "g"), "~");
  return s.length > max ? s.slice(0, max) + "...[truncated]" : s;
}
function errInfo(e) {
  if (!e) return undefined;
  return { name: e.name, code: e.code ?? undefined, message: redact(e.message ?? String(e), 500) };
}
let currentCheck = "setup";
let eventSeq = 0;
function record(src, type, summary, extra = {}) {
  const line = { seq: ++eventSeq, ts: new Date().toISOString(), tMs: Date.now() - T0, check: currentCheck, src, type, ...extra, summary };
  try { appendFileSync(EVENTS_FILE, JSON.stringify(line) + "\n"); } catch { /* keep going */ }
  return line;
}
const base = (p) => (typeof p === "string" ? basename(p) : undefined);
function summarize(ev) {
  const d = ev && ev.data && typeof ev.data === "object" ? ev.data : {};
  switch (ev.type) {
    case "session.start":
      return { sessionId: d.sessionId, selectedModel: d.selectedModel, copilotVersion: d.copilotVersion, producer: d.producer };
    case "session.resume":
      return { eventCount: d.eventCount, selectedModel: d.selectedModel, sessionWasActive: d.sessionWasActive, continuePendingWork: d.continuePendingWork };
    case "session.error":
      return { errorType: d.errorType, errorCode: d.errorCode, statusCode: d.statusCode, providerErrorType: d.providerErrorType, message: redact(d.message) };
    case "session.warning":
    case "session.info":
      return { kind: d.warningType ?? d.infoType, message: redact(d.message) };
    case "abort":
      return { reason: d.reason };
    case "assistant.message_delta":
      return { messageId: d.messageId, deltaContent: redact(d.deltaContent) };
    case "assistant.reasoning_delta":
    case "assistant.reasoning":
      return { length: typeof d.deltaContent === "string" ? d.deltaContent.length : typeof d.content === "string" ? d.content.length : undefined };
    case "assistant.message":
      return { messageId: d.messageId, model: d.model, content: redact(d.content), toolRequests: Array.isArray(d.toolRequests) ? d.toolRequests.map((t) => t && t.name) : undefined };
    case "assistant.usage":
      return { model: d.model, inputTokens: d.inputTokens, outputTokens: d.outputTokens };
    case "tool.execution_start":
      return { toolName: d.toolName, toolCallId: d.toolCallId, readOnly: d.readOnly };
    case "tool.execution_complete":
      return {
        toolCallId: d.toolCallId, success: d.success, error: d.error ? { code: d.error.code, message: redact(d.error.message) } : undefined,
        fileEdits: Array.isArray(d.fileEdits) ? d.fileEdits.map((f) => ({ kind: f.kind, file: base(f.path) })) : undefined,
      };
    case "permission.requested": {
      const r = d.permissionRequest || {};
      return { requestId: d.requestId, kind: r.kind, toolCallId: r.toolCallId, permissionMode: d.permissionMode, file: base(r.fileName ?? r.path) };
    }
    case "permission.completed":
      return { requestId: d.requestId, result: d.result && d.result.kind, decisionSource: d.decisionSource, toolCallId: d.toolCallId };
    case "user_input.requested":
      return { requestId: d.requestId, question: redact(d.question), choices: Array.isArray(d.choices) ? d.choices.length : undefined };
    case "session.idle":
      return { keys: Object.keys(d).slice(0, 10) };
    default:
      return { keys: Object.keys(d).slice(0, 15) };
  }
}

// ---------- results ----------
const results = {};
const setResult = (id, status, reason, extra = {}) => {
  if (status === "fail" && extra.error && extra.error.code === "POC_BUDGET") { status = "not-run"; reason = `time budget exhausted (${reason})`; }
  results[id] = { status, reason: redact(reason, 300), ...extra };
};
for (const id of ["M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "M-07", "M-08", "M-09"]) setResult(id, "not-run", "not reached");
setResult("M-06", "not-run", "needs a VS Code GitHub session token inside an extension; out of scope for plain node (OP-007)");
setResult("M-07", "not-run", "needs an Extension Development Host; run separately");
const meta = {
  tool: "featherspec-studio copilot poc", sdk: "@github/copilot-sdk", sdkPinned: "1.0.34", sdkExpectsCli: SDK_EXPECTS_CLI,
  sdkProtocolVersion: SDK_PROTOCOL_VERSION, node: process.version, platform: `${process.platform}-${process.arch}`,
  startedAt: new Date(T0).toISOString(), prompts: PROMPTS, settings: {
    permissionMode: "manual", streaming: true, enableSessionTelemetry: false, env_COPILOT_TELEMETRY_DISABLED: "true",
    tokenEnvVarsRemovedFromRuntimeEnv: ["COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"], useLoggedInUser: true,
    trustWorkingDirectory: "session", workingDirectory: "./scratch",
  },
  steps: [], permissionHandlerCalls: [], notes: [],
};

let finished = false;
const liveClients = new Set();
function writeReport(why) {
  meta.endedAt = new Date().toISOString();
  meta.durationMs = Date.now() - T0;
  meta.endReason = why;
  meta.eventLines = eventSeq;
  try { writeFileSync(REPORT_FILE, JSON.stringify({ results, meta }, null, 2) + "\n"); } catch (e) { process.stderr.write(`report write failed: ${e.message}\n`); }
}
async function finish(why) {
  if (finished) return;
  finished = true;
  currentCheck = "teardown";
  for (const c of liveClients) { try { await withTimeout(c.forceStop(), 4000, "forceStop"); } catch { /* best effort */ } }
  writeReport(why);
  process.stdout.write(JSON.stringify({ report: REPORT_FILE, events: EVENTS_FILE, results }, null, 2) + "\n");
  process.exit(0);
}
setTimeout(() => { record("poc", "poc.watchdog", { note: "global deadline reached" }); finish("global watchdog (230 s)"); }, 230_000);
setTimeout(() => { writeReport("hard exit (236 s)"); process.exit(0); }, 236_000).unref();
process.on("unhandledRejection", (e) => { record("poc", "poc.unhandledRejection", { error: errInfo(e) }); });
process.on("uncaughtException", (e) => { record("poc", "poc.uncaughtException", { error: errInfo(e) }); });

// ---------- helpers ----------
const remaining = () => DEADLINE - Date.now() - RESERVE_MS;
const budget = (max) => Math.max(0, Math.min(max, remaining()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(t)),
    new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error(`timeout after ${ms} ms: ${label}`), { code: "POC_TIMEOUT" })), ms); }),
  ]);
}
async function step(name, maxMs, fn) {
  const ms = budget(maxMs);
  const s = { name, check: currentCheck, startMs: Date.now() - T0, budgetMs: ms };
  meta.steps.push(s);
  if (ms < 1000) { s.ok = false; s.error = { message: "skipped: time budget exhausted" }; record("poc", "poc.step.skipped", { name }); throw Object.assign(new Error(`skipped ${name}: time budget exhausted`), { code: "POC_BUDGET" }); }
  record("poc", "poc.step.start", { name, budgetMs: ms });
  try {
    const v = await withTimeout(fn(), ms, name);
    s.ok = true; s.ms = Date.now() - T0 - s.startMs;
    record("poc", "poc.step.ok", { name, ms: s.ms });
    return v;
  } catch (e) {
    s.ok = false; s.ms = Date.now() - T0 - s.startMs; s.error = errInfo(e);
    record("poc", "poc.step.error", { name, ms: s.ms, error: s.error });
    throw e;
  }
}
function makeSink(label) {
  const waiters = new Set();
  const seen = [];
  const handler = (ev) => {
    try {
      const line = record("sdk", ev && ev.type, summarize(ev || {}), { session: label, eventId: ev && ev.id, ephemeral: ev && ev.ephemeral ? true : undefined, agentId: ev && ev.agentId ? ev.agentId : undefined });
      seen.push({ type: ev.type, check: currentCheck, tMs: line.tMs, summary: line.summary });
      for (const w of [...waiters]) if (w.pred(ev)) { waiters.delete(w); clearTimeout(w.t); w.resolve(ev); }
    } catch (e) { record("poc", "poc.sinkError", { error: errInfo(e) }); }
  };
  const waitFor = (pred, ms, what) => new Promise((resolve, reject) => {
    const w = { pred, resolve };
    w.t = setTimeout(() => { if (waiters.delete(w)) reject(Object.assign(new Error(`timeout after ${ms} ms waiting for ${what}`), { code: "POC_TIMEOUT" })); }, Math.max(1, ms));
    waiters.add(w);
  });
  return { handler, waitFor, seen };
}
const isEnd = (ev) => ev.type === "session.idle" || ev.type === "session.error";

// Deny-all permission handler (records every request; no secrets, no file contents).
function denyAll(request, invocation) {
  const r = request || {};
  const rec = {
    check: currentCheck, tMs: Date.now() - T0, kind: r.kind, toolCallId: r.toolCallId, toolName: r.toolName,
    managedApprovalRequired: r.managedApprovalRequired, invocationSessionId: invocation && invocation.sessionId,
    detail: r.kind === "shell" ? redact(r.fullCommandText) : r.kind === "write" ? base(r.fileName) : r.kind === "read" ? base(r.path) : r.kind === "url" ? redact(r.url) : undefined,
    intention: redact(r.intention),
  };
  meta.permissionHandlerCalls.push(rec);
  record("handler", "permission.handler", rec);
  return { kind: "reject", feedback: DENY_FEEDBACK };
}
function sessionConfig(sink, { create }) {
  const cfg = {
    clientName: "featherspec-studio-poc",
    workingDirectory: SCRATCH,
    permissionMode: "manual",
    streaming: true,
    enableSessionTelemetry: false,
    onPermissionRequest: denyAll,
    onEvent: sink.handler,
  };
  if (create) cfg.trustWorkingDirectory = "session";
  return cfg;
}

// ---------- runtime resolution ----------
function findInstalledCli() {
  const dirs = (process.env.PATH || process.env.Path || "").split(delimiter).filter(Boolean);
  const names = isWin ? ["copilot.exe", "copilot.cmd", "copilot.bat", "copilot"] : ["copilot"];
  for (const d of dirs) for (const n of names) {
    const p = join(d, n);
    let isFile = false;
    try { isFile = statSync(p).isFile(); } catch { /* skip */ }
    if (!isFile) continue;
    if (isWin && !n.endsWith(".exe")) {
      const loader = join(d, "node_modules", "@github", "copilot", "npm-loader.js");
      if (existsSync(loader)) return { hit: p, path: loader, kind: "npm-js" }; // SDK spawns .js with node
      continue; // .cmd shim we cannot spawn without a shell
    }
    return { hit: p, path: p, kind: "executable" };
  }
  return null;
}
function runtimeEnv(mode) {
  const env = {};
  const drop = new Set(["COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"]);
  if (mode === "bundled") drop.add("COPILOT_CLI_PATH");
  for (const [k, v] of Object.entries(process.env)) if (!drop.has(k.toUpperCase())) env[k] = v;
  env.COPILOT_TELEMETRY_DISABLED = "true";
  return env;
}

// ---------- main ----------
async function main() {
  try { rmSync(EVENTS_FILE, { force: true }); } catch { /* ignore */ }
  try { rmSync(SCRATCH, { recursive: true, force: true }); } catch { /* ignore */ }
  try { rmSync(PROBE_HOME, { recursive: true, force: true }); } catch { /* ignore */ }
  mkdirSync(SCRATCH, { recursive: true });
  record("poc", "poc.start", { node: process.version, platform: meta.platform });

  let sdk;
  try {
    sdk = await step("import @github/copilot-sdk", 20_000, () => import("@github/copilot-sdk"));
  } catch (e) {
    for (const id of ["M-01", "M-02", "M-03", "M-04", "M-05", "M-08", "M-09"]) setResult(id, "fail", "SDK import failed - run npm install", { error: errInfo(e) });
    return;
  }
  const { CopilotClient, RuntimeConnection } = sdk;

  const arg = (process.argv.find((a) => a.startsWith("--runtime=")) || "--runtime=auto").split("=")[1];
  const installed = arg === "bundled" ? null : findInstalledCli();
  meta.runtimeRequested = arg;
  meta.installedCli = installed ? { kind: installed.kind, hit: redact(installed.hit), path: redact(installed.path) } : null;

  const makeClient = (mode, extra = {}) => {
    const opts = { workingDirectory: SCRATCH, logLevel: "error", useLoggedInUser: true, env: runtimeEnv(mode), ...extra };
    if (mode === "installed") opts.connection = RuntimeConnection.forStdio({ path: installed.path });
    const c = new CopilotClient(opts);
    liveClients.add(c);
    return c;
  };
  const stopClient = async (c, label) => {
    if (!c) return;
    try { await step(`stop ${label}`, 15_000, () => c.stop()); }
    catch { try { await withTimeout(c.forceStop(), 5000, "forceStop"); } catch { /* ignore */ } }
    liveClients.delete(c);
  };

  // ----- start + M-09 (version / protocol) -----
  currentCheck = "M-09";
  let client = null;
  let mode = installed ? "installed" : "bundled";
  if (arg === "installed" && !installed) {
    setResult("M-09", "fail", "--runtime=installed but no spawnable copilot found on PATH");
    return;
  }
  for (const tryMode of mode === "installed" && arg === "auto" ? ["installed", "bundled"] : [mode]) {
    try {
      const c = makeClient(tryMode);
      await step(`client.start (${tryMode})`, 45_000, () => c.start());
      client = c; mode = tryMode; break;
    } catch (e) {
      if (tryMode === "installed") setResult("M-09", "fail", "SDK 1.0.34 could not start the installed CLI; falling back to bundled runtime", { error: errInfo(e) });
      else setResult("M-09", results["M-09"].status === "fail" ? "fail" : "not-run", "bundled runtime failed to start", { error: errInfo(e) });
      const failed = [...liveClients].pop(); if (failed) { try { await withTimeout(failed.forceStop(), 5000, "forceStop"); } catch { /* ignore */ } liveClients.delete(failed); }
    }
  }
  meta.runtimeUsed = client ? mode : null;
  if (!client) {
    for (const id of ["M-01", "M-02", "M-03", "M-04", "M-05", "M-08"]) setResult(id, "fail", "Copilot runtime could not be started", { error: meta.steps.filter((s) => !s.ok).map((s) => s.error).pop() });
    return;
  }
  try {
    const st = await step("client.getStatus", 10_000, () => client.getStatus());
    meta.status = { version: st.version, protocolVersion: st.protocolVersion };
    record("poc", "poc.status", meta.status);
    if (mode === "installed") {
      const ok = st.protocolVersion === SDK_PROTOCOL_VERSION;
      setResult("M-09", ok ? "pass" : "fail", `SDK 1.0.34 (expects CLI ${SDK_EXPECTS_CLI}, protocol ${SDK_PROTOCOL_VERSION}) started the installed CLI ${st.version}, protocol ${st.protocolVersion}${ok ? "" : " (mismatch)"}; remaining checks confirm it works`, { installedCliVersion: st.version, protocolVersion: st.protocolVersion });
    } else if (results["M-09"].status !== "fail") {
      setResult("M-09", "not-run", `no spawnable installed copilot CLI on PATH${arg === "bundled" ? " (bundled forced)" : ""}; bundled runtime ${st.version} used`, { bundledVersion: st.version });
    } else {
      results["M-09"].bundledVersion = st.version;
    }
  } catch (e) {
    if (mode === "installed") setResult("M-09", "fail", "getStatus failed against the installed CLI", { error: errInfo(e) });
  }

  // ----- M-01: auth status + model list -----
  currentCheck = "M-01";
  let auth = null;
  let models = null;
  let modelsErr = null;
  try {
    auth = await step("client.getAuthStatus", 15_000, () => client.getAuthStatus());
    if (auth && auth.login) masks.push(auth.login);
    meta.auth = { isAuthenticated: auth.isAuthenticated, authType: auth.authType, host: auth.host, loginPresent: Boolean(auth.login), statusMessage: redact(auth.statusMessage) };
    record("poc", "poc.authStatus", meta.auth);
  } catch (e) { meta.auth = { error: errInfo(e) }; }
  try {
    models = await step("client.listModels", 25_000, () => client.listModels());
    meta.models = { count: models.length, ids: models.slice(0, 40).map((m) => ({ id: m.id, policy: m.policy && m.policy.state })) };
    record("poc", "poc.models", { count: models.length });
  } catch (e) { modelsErr = errInfo(e); meta.models = { error: modelsErr }; }
  const signedIn = Boolean(auth && auth.isAuthenticated);
  if (signedIn && models && models.length > 0) setResult("M-01", "pass", `signed in (authType ${auth.authType}); listModels returned ${models.length} models`, { scope: "signed-in half only; repeat signed out to record the error shape" });
  else if (!signedIn) setResult("M-01", "fail", "not signed in - signed-out error shape recorded; sign in with `copilot` (device flow) and rerun", { signedOutShape: { authStatus: meta.auth, listModelsError: modelsErr } });
  else setResult("M-01", "fail", "signed in but listModels failed or returned none", { error: modelsErr });

  // ----- session create -----
  currentCheck = "M-03";
  const sink1 = makeSink("s1");
  let session = null;
  try {
    session = await step("client.createSession", 30_000, () => client.createSession(sessionConfig(sink1, { create: true })));
    meta.sessionId = session.sessionId;
    meta.permissionModeResult = session.permissionModeResult ? { success: session.permissionModeResult.success, mode: session.permissionModeResult.mode } : null;
    record("poc", "poc.sessionCreated", { sessionId: session.sessionId, permissionModeResult: meta.permissionModeResult });
  } catch (e) {
    for (const id of ["M-02", "M-03", "M-04", "M-05"]) setResult(id, "fail", "createSession failed", { error: errInfo(e) });
  }

  // ----- P1: trivial prompt (M-03 partial) -----
  let p1Ok = false;
  if (session) {
    const before = meta.permissionHandlerCalls.length;
    try {
      const end = sink1.waitFor(isEnd, budget(50_000), "session.idle after P1");
      end.catch(() => {});
      await step("send P1", 15_000, () => session.send({ prompt: PROMPTS.p1 }));
      const ev = await end;
      const msgs = sink1.seen.filter((s) => s.check === "M-03" && s.type === "assistant.message");
      const text = msgs.map((m) => m.summary.content || "").join(" ");
      const deltas = sink1.seen.filter((s) => s.check === "M-03" && s.type === "assistant.message_delta").length;
      const perms = meta.permissionHandlerCalls.length - before;
      p1Ok = ev.type === "session.idle";
      const types = [...new Set(sink1.seen.filter((s) => s.check === "M-03").map((s) => s.type))];
      setResult("M-03", p1Ok && /\bok\b/i.test(text) ? "pass" : "fail",
        ev.type === "session.error" ? `session.error ${ev.data && ev.data.errorType}: ${ev.data && ev.data.message}` : `ended with session.idle; reply "${text}"; ${deltas} deltas; ${perms} permission requests`,
        { scope: "partial: trivial prompt, not the A3 prompt; fileEdits not observable under deny-all", eventTypes: types, deltas, reply: redact(text), endEvent: ev.type, errorType: ev.data && ev.data.errorType });
    } catch (e) { setResult("M-03", "fail", "P1 did not complete", { error: errInfo(e) }); }
  }

  // ----- P2: permission request observed and denied (M-02) -----
  currentCheck = "M-02";
  if (session && signedIn) {
    const before = meta.permissionHandlerCalls.length;
    try {
      const end = sink1.waitFor(isEnd, budget(70_000), "session.idle after P2");
      end.catch(() => {});
      await step("send P2", 15_000, () => session.send({ prompt: PROMPTS.p2 }));
      let endEv = null; let endErr = null;
      try { endEv = await end; } catch (e) { endErr = e; }
      const calls = meta.permissionHandlerCalls.slice(before);
      const evs = sink1.seen.filter((s) => s.check === "M-02");
      const reqEvents = evs.filter((s) => s.type === "permission.requested");
      const completed = evs.filter((s) => s.type === "permission.completed");
      const toolOk = evs.filter((s) => s.type === "tool.execution_complete" && s.summary.success === true).map((s) => s.summary.toolCallId);
      const deniedIds = new Set(calls.map((c) => c.toolCallId).filter(Boolean));
      const ranAnyway = toolOk.filter((id) => deniedIds.has(id));
      const fileExists = existsSync(join(SCRATCH, "hello.txt"));
      const idCounts = {}; for (const c of calls) if (c.toolCallId) idCounts[c.toolCallId] = (idCounts[c.toolCallId] || 0) + 1;
      const dupes = Object.values(idCounts).filter((n) => n > 1).length;
      const kinds = [...new Set(calls.map((c) => c.kind))];
      const pass = calls.length > 0 && !fileExists && ranAnyway.length === 0;
      setResult("M-02", pass ? "pass" : "fail",
        `${calls.length} handler calls (kinds: ${kinds.join(",") || "none"}), ${reqEvents.length} permission.requested events, ${completed.length} permission.completed; hello.txt ${fileExists ? "EXISTS" : "absent"}; ${ranAnyway.length} denied tool calls completed successfully${endErr ? "; " + endErr.message : ""}`,
        { scope: "partial: deny-all only (write approve-once not tested by this PoC)", handlerCalls: calls.length, kinds, readsAsked: kinds.includes("read"), duplicateRequestsPerToolCall: dupes, permissionRequestedEvents: reqEvents.length, permissionCompletedResults: completed.map((c) => c.summary.result), helloTxtExists: fileExists, endEvent: endEv && endEv.type });
    } catch (e) { setResult("M-02", "fail", "P2 failed", { error: errInfo(e), helloTxtExists: existsSync(join(SCRATCH, "hello.txt")) }); }
  } else if (session) setResult("M-02", "not-run", "not signed in");

  // ----- P3: abort shortly after start (M-04) -----
  currentCheck = "M-04";
  if (session && signedIn) {
    const filesBefore = safeList(SCRATCH);
    try {
      const firstActivity = sink1.waitFor((ev) => ev.type === "assistant.turn_start" || ev.type === "assistant.message_delta" || ev.type === "assistant.message_start", budget(20_000), "first activity after P3");
      firstActivity.catch(() => {});
      const abortEv = sink1.waitFor((ev) => ev.type === "abort", budget(45_000), "abort event");
      abortEv.catch(() => {});
      const idleEv = sink1.waitFor(isEnd, budget(45_000), "idle after abort");
      idleEv.catch(() => {});
      await step("send P3", 15_000, () => session.send({ prompt: PROMPTS.p3 }));
      try { await firstActivity; } catch { /* abort anyway */ }
      await sleep(1500);
      const tAbort = Date.now();
      await step("session.abort", 10_000, () => session.abort());
      const ackMs = Date.now() - tAbort;
      let abortMs = null; let abortReason; let idleAfter = false;
      try { const ev = await withTimeout(abortEv, budget(15_000), "abort event"); abortMs = Date.now() - tAbort; abortReason = ev.data && ev.data.reason; } catch { /* none */ }
      try { await withTimeout(idleEv, budget(10_000), "idle after abort"); idleAfter = true; } catch { /* none */ }
      await sleep(1000);
      const abortSeen = sink1.seen.find((s) => s.check === "M-04" && s.type === "abort");
      const deltasAfter = abortSeen ? sink1.seen.filter((s) => s.check === "M-04" && s.type === "assistant.message_delta" && s.tMs > abortSeen.tMs).length : null;
      const newFiles = safeList(SCRATCH).filter((f) => !filesBefore.includes(f));
      setResult("M-04", abortMs !== null && newFiles.length === 0 ? "pass" : "fail",
        `abort() acked in ${ackMs} ms; abort event ${abortMs !== null ? `after ${abortMs} ms (reason ${abortReason})` : "NOT observed"}; idle after abort: ${idleAfter}; ${deltasAfter ?? "n/a"} deltas after abort; new files: ${newFiles.length}`,
        { scope: "abort ~1.5 s after first activity, not 5 s into a tool-using run", ackMs, abortEventMs: abortMs, abortReason, idleAfterAbort: idleAfter, deltasAfterAbort: deltasAfter, newFiles });
    } catch (e) { setResult("M-04", "fail", "abort check failed", { error: errInfo(e) }); }
  } else if (session) setResult("M-04", "not-run", "not signed in");

  // ----- M-05: resume in a fresh client (new runtime process, same node process) -----
  currentCheck = "M-05";
  const sessionId = session && session.sessionId;
  if (session) { try { await step("session.disconnect", 10_000, () => session.disconnect()); } catch { /* recorded */ } }
  await stopClient(client, "client 1");
  client = null;
  if (sessionId && signedIn) {
    let c2 = null;
    try {
      c2 = makeClient(mode);
      await step("client2.start", 40_000, () => c2.start());
      let metaFound = null;
      try { metaFound = await step("client2.getSessionMetadata", 10_000, () => c2.getSessionMetadata(sessionId)); } catch { /* recorded */ }
      const sink2 = makeSink("s2-resumed");
      const tResume = Date.now();
      const s2 = await step("client2.resumeSession", 30_000, () => c2.resumeSession(sessionId, sessionConfig(sink2, { create: false })));
      const resumeMs = Date.now() - tResume;
      await sleep(500);
      const replayed = sink2.seen.length;
      const replayedTypes = [...new Set(sink2.seen.map((s) => s.type))];
      const end = sink2.waitFor(isEnd, budget(45_000), "idle after P4");
      end.catch(() => {});
      await step("send P4", 15_000, () => s2.send({ prompt: PROMPTS.p4 }));
      const ev = await end;
      const text = sink2.seen.filter((s) => s.type === "assistant.message").map((m) => m.summary.content || "").join(" ");
      const remembers = /\bok\b/i.test(text);
      setResult("M-05", ev.type === "session.idle" && remembers ? "pass" : "fail",
        `resumed in ${resumeMs} ms (metadata ${metaFound ? "found" : "not found"}); ${replayed} events before P4 (${replayedTypes.join(",") || "none"}); reply "${text}"`,
        { scope: "fresh client and runtime process, same node process; not an extension-host restart", resumeMs, eventsBeforePrompt: replayed, eventTypesBeforePrompt: replayedTypes, reply: redact(text), remembersFirstAnswer: remembers, endEvent: ev.type });
      try { await step("session2.disconnect", 10_000, () => s2.disconnect()); } catch { /* recorded */ }
    } catch (e) { setResult("M-05", "fail", "resume failed", { error: errInfo(e) }); }
    await stopClient(c2, "client 2");
  } else setResult("M-05", "not-run", sessionId ? "not signed in" : "no session to resume");

  // ----- M-08: login visible from a separate (empty) base directory -----
  currentCheck = "M-08";
  let c3 = null;
  try {
    mkdirSync(PROBE_HOME, { recursive: true });
    c3 = makeClient(mode, { baseDirectory: PROBE_HOME });
    await step("client3.start (baseDirectory probe)", 40_000, () => c3.start());
    const a3 = await step("client3.getAuthStatus", 15_000, () => c3.getAuthStatus());
    if (a3 && a3.login) masks.push(a3.login);
    const info = { isAuthenticated: a3.isAuthenticated, authType: a3.authType, statusMessage: redact(a3.statusMessage), defaultHomeAuthType: auth && auth.authType };
    record("poc", "poc.probeAuthStatus", info);
    if (!signedIn) setResult("M-08", "not-run", "default Copilot home is not signed in either; nothing to compare", info);
    else setResult("M-08", a3.isAuthenticated ? "pass" : "fail",
      `with an empty baseDirectory (COPILOT_HOME) auth is ${a3.isAuthenticated ? "visible" : "NOT visible"} (authType ${a3.authType}; default home authType ${auth && auth.authType})`,
      { scope: "probe dir ./probe-copilot-home, not Studio's global storage; authType gh-cli means the gh login, not the copilot login, was used", ...info });
  } catch (e) { setResult("M-08", "fail", "baseDirectory probe failed", { error: errInfo(e) }); }
  await stopClient(c3, "client 3");
}

function safeList(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

main()
  .catch((e) => { record("poc", "poc.mainError", { error: errInfo(e) }); meta.notes.push(`main error: ${redact(e && e.message)}`); })
  .finally(() => finish("completed"));
