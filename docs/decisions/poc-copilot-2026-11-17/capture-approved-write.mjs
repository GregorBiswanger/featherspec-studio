// FeatherSpec Studio - capture of an APPROVED file write (spec 0010 M-03, follow-up to the host smoke of 2026-11-17).
// Non-interactive, no input. One session in a fresh ./scratch-approve, one prompt, a handler that approves exactly
// ONE write request for a path inside that folder and denies everything else. Every SDK event is recorded.
// Output: events-approved-write.jsonl (one redacted line per event or handler call). Ends within 3 minutes, exit code 0.
// Usage: node capture-approved-write.mjs   (run beside poc.mjs, where @github/copilot-sdk 1.0.34 is installed)
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const T0 = Date.now();
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRATCH = join(HERE, "scratch-approve");
const EVENTS_FILE = join(HERE, "events-approved-write.jsonl");
const TARGET = join(SCRATCH, "hello.txt");
const PROMPT = "Create the file hello.txt containing the text hello. Then reply with the single word done.";
const DENY_FEEDBACK = "Denied by the FeatherSpec Studio capture (only one write inside scratch-approve is approved).";
const HOME = homedir();
const isWin = process.platform === "win32";
const RUN_DEADLINE_MS = 150_000;

const KNOWN_TO_MAPPER = new Set([
  "session.start", "session.resume", "assistant.turn_start", "assistant.turn_end", "assistant.message_delta", "assistant.message",
  "assistant.reasoning", "tool.execution_start", "tool.execution_progress", "tool.execution_complete", "permission.requested",
  "permission.completed", "user_input.requested", "elicitation.requested", "user_input.completed", "elicitation.completed",
  "session.todos_changed", "assistant.usage", "session.warning", "session.idle", "session.error", "abort",
  "assistant.streaming_delta", "assistant.message_start", "assistant.tool_call_delta", "assistant.reasoning_delta", "assistant.idle",
  "user.message", "system.message", "pending_messages.modified", "session.managed_settings_resolved",
  "session.mcp_server_status_changed", "session.mcp_servers_loaded", "session.tools_updated", "session.title_changed",
  "session.model_change", "session.usage_info", "session.usage_checkpoint", "session.background_tasks_changed",
  "session.shutdown", "agent.interrupted", "prompt_cache_break",
]);
const DETAILED = (type) => (!KNOWN_TO_MAPPER.has(type) && !type.startsWith("model."))
  || type.startsWith("tool.") || type.startsWith("permission.") || /file/i.test(type) || type === "session.idle";
const SECRET_KEY = /token|auth|secret|passw|cookie|header|credential|api_?key|bearer|login|signature|cert/i;

// ---------- redaction ----------
const masks = [];
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const variants = (p) => [...new Set([p, p.replace(/\\/g, "/"), p.replace(/\//g, "\\"), p.replace(/[\\/]/g, "\\\\")])].sort((a, b) => b.length - a.length);
const scratchForms = () => {
  const forms = [SCRATCH];
  try { forms.push(realpathSync.native(SCRATCH)); } catch { /* not yet there */ }
  return [...new Set(forms.flatMap(variants))].sort((a, b) => b.length - a.length);
};
let SCRATCH_FORMS = variants(SCRATCH);
function redact(v, max = 200) {
  if (v === undefined || v === null) return v;
  let s = typeof v === "string" ? v : String(v);
  s = s
    .replace(/\b(gh[opusr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,})/g, "[REDACTED_TOKEN]")
    .replace(/(bearer|token)(\s*[:=]?\s*)[A-Za-z0-9._-]{16,}/gi, "$1$2[REDACTED]");
  for (const f of SCRATCH_FORMS) s = s.replace(new RegExp(escapeRe(f), isWin ? "gi" : "g"), "{{root}}");
  if (HOME) for (const h of variants(HOME)) s = s.replace(new RegExp(escapeRe(h), isWin ? "gi" : "g"), "~");
  for (const m of masks) if (m) s = s.replace(new RegExp(escapeRe(m), "gi"), "[LOGIN]");
  return s.length > max ? s.slice(0, max) + "...[truncated]" : s;
}
function scrub(value, depth = 0) {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return redact(value);
  if (depth >= 6) return "[depth]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrub(item, depth + 1)).concat(value.length > 20 ? [`[+${value.length - 20} more]`] : []);
  if (typeof value === "object") {
    const out = {};
    for (const [k, item] of Object.entries(value)) out[k] = SECRET_KEY.test(k) ? "[omitted]" : scrub(item, depth + 1);
    return out;
  }
  return `[${typeof value}]`;
}
const errInfo = (e) => (e ? { name: e.name, code: e.code ?? undefined, message: redact(e.message ?? String(e), 500) } : undefined);

// ---------- recording ----------
let seq = 0;
function record(src, type, fields) {
  const line = { seq: ++seq, ts: new Date().toISOString(), tMs: Date.now() - T0, check: "M-03-approve", src, type, ...fields };
  try { appendFileSync(EVENTS_FILE, JSON.stringify(line) + "\n"); } catch { /* keep going */ }
}
const seen = [];
const waiters = new Set();
function onEvent(ev) {
  try {
    const d = ev && ev.data && typeof ev.data === "object" ? ev.data : {};
    const type = String(ev && ev.type);
    const fields = { session: "s1", eventId: ev.id, parentId: ev.parentId ?? undefined, ephemeral: ev.ephemeral ? true : undefined, agentId: ev.agentId || undefined, keys: Object.keys(d) };
    if (DETAILED(type)) fields.data = scrub(d);
    else if (type === "assistant.message") fields.summary = { messageId: d.messageId, content: redact(d.content), toolRequests: Array.isArray(d.toolRequests) ? d.toolRequests.map((t) => t && t.name) : undefined };
    else if (type === "assistant.message_delta") fields.summary = { deltaContent: redact(d.deltaContent) };
    else if (type === "session.start" || type === "session.resume") fields.summary = { sessionId: d.sessionId, selectedModel: d.selectedModel, copilotVersion: d.copilotVersion };
    else if (type === "assistant.usage") fields.summary = { inputTokens: d.inputTokens, outputTokens: d.outputTokens };
    record("sdk", type, fields);
    seen.push(type);
    for (const w of [...waiters]) if (w.pred(ev)) { waiters.delete(w); w.resolve(ev); }
  } catch (e) { record("capture", "capture.sinkError", { error: errInfo(e) }); }
}
const waitFor = (pred, ms) => new Promise((res) => {
  const w = { pred, resolve: res };
  waiters.add(w);
  setTimeout(() => { if (waiters.delete(w)) res(null); }, Math.max(1, ms));
});

// ---------- permission handler: exactly one write inside SCRATCH ----------
let approvedWrites = 0;
const insideScratch = (p) => {
  if (typeof p !== "string" || p === "") return false;
  const rel = relative(SCRATCH, resolve(SCRATCH, p));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
};
function onPermissionRequest(request) {
  const r = request || {};
  const target = r.kind === "write" ? r.fileName ?? r.resolvedPath : undefined;
  const approve = r.kind === "write" && approvedWrites === 0 && insideScratch(target);
  if (approve) approvedWrites++;
  const answer = approve ? { kind: "approve-once" } : { kind: "reject", feedback: DENY_FEEDBACK };
  record("handler", "permission.handler", { keys: Object.keys(r), data: { request: scrub(r) }, decision: answer.kind });
  return answer;
}

// ---------- runtime resolution (as poc.mjs) ----------
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
      if (existsSync(loader)) return { path: loader };
      continue;
    }
    return { path: p };
  }
  return null;
}
function runtimeEnv() {
  const env = {};
  const drop = new Set(["COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"]);
  for (const [k, v] of Object.entries(process.env)) if (!drop.has(k.toUpperCase())) env[k] = v;
  env.COPILOT_TELEMETRY_DISABLED = "true";
  return env;
}
const withTimeout = (p, ms, label) => {
  let t;
  return Promise.race([Promise.resolve(p).finally(() => clearTimeout(t)), new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`timeout after ${ms} ms: ${label}`)), ms); })]);
};

// ---------- main ----------
let client = null;
let done = false;
async function finish(why) {
  if (done) return;
  done = true;
  if (client) { try { await withTimeout(client.stop(), 10_000, "stop"); } catch { try { await withTimeout(client.forceStop(), 4_000, "forceStop"); } catch { /* best effort */ } } }
  record("capture", "capture.end", { why, durationMs: Date.now() - T0, eventLines: seq });
  process.stdout.write(JSON.stringify({ events: EVENTS_FILE, why, approvedWrites, fileExists: existsSync(TARGET), sdkEventTypes: [...new Set(seen)] }, null, 2) + "\n");
  process.exit(0);
}
setTimeout(() => finish("watchdog (170 s)"), 170_000);
setTimeout(() => process.exit(0), 178_000).unref();
process.on("unhandledRejection", (e) => record("capture", "capture.unhandledRejection", { error: errInfo(e) }));
process.on("uncaughtException", (e) => record("capture", "capture.uncaughtException", { error: errInfo(e) }));

async function main() {
  try { rmSync(EVENTS_FILE, { force: true }); } catch { /* ignore */ }
  try { rmSync(SCRATCH, { recursive: true, force: true }); } catch { /* ignore */ }
  mkdirSync(SCRATCH, { recursive: true });
  SCRATCH_FORMS = scratchForms();
  record("capture", "capture.start", { node: process.version, platform: `${process.platform}-${process.arch}`, prompt: PROMPT });

  let sdk;
  try { sdk = await withTimeout(import("@github/copilot-sdk"), 20_000, "import sdk"); }
  catch (e) { record("capture", "capture.error", { step: "import @github/copilot-sdk", error: errInfo(e) }); return; }
  const { CopilotClient, RuntimeConnection } = sdk;
  const installed = findInstalledCli();
  const opts = { workingDirectory: SCRATCH, logLevel: "error", useLoggedInUser: true, env: runtimeEnv() };
  if (installed) opts.connection = RuntimeConnection.forStdio({ path: installed.path });
  client = new CopilotClient(opts);
  try {
    await withTimeout(client.start(), 45_000, "client.start");
    const st = await withTimeout(client.getStatus(), 10_000, "getStatus");
    const auth = await withTimeout(client.getAuthStatus(), 15_000, "getAuthStatus");
    if (auth && auth.login) masks.push(auth.login);
    record("capture", "capture.runtime", { runtime: installed ? "installed" : "bundled", cliVersion: st.version, protocolVersion: st.protocolVersion, isAuthenticated: Boolean(auth && auth.isAuthenticated), authType: auth && auth.authType });
    if (!auth || !auth.isAuthenticated) { record("capture", "capture.error", { step: "auth", error: { message: "not signed in; run `copilot` and sign in" } }); return; }
  } catch (e) { record("capture", "capture.error", { step: "client start/status", error: errInfo(e) }); return; }

  let session;
  try {
    session = await withTimeout(client.createSession({
      clientName: "featherspec-studio-capture", workingDirectory: SCRATCH, permissionMode: "manual", streaming: true,
      enableSessionTelemetry: false, trustWorkingDirectory: "session", onPermissionRequest, onEvent,
    }), 30_000, "createSession");
  } catch (e) { record("capture", "capture.error", { step: "createSession", error: errInfo(e) }); return; }

  const end = waitFor((ev) => ev.type === "session.idle" || ev.type === "session.error", RUN_DEADLINE_MS);
  try { await withTimeout(session.send({ prompt: PROMPT }), 15_000, "send"); }
  catch (e) { record("capture", "capture.error", { step: "send", error: errInfo(e) }); }
  const endEv = await end;
  await new Promise((r) => setTimeout(r, 3_000));
  let content = null;
  try { content = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : null; } catch { /* unreadable */ }
  record("capture", "capture.verify", { endEvent: endEv ? endEv.type : "timeout", approvedWrites, fileExists: content !== null, fileContent: content === null ? undefined : redact(content) });
  try { await withTimeout(session.disconnect(), 10_000, "disconnect"); } catch { /* recorded by end */ }
}

main()
  .catch((e) => record("capture", "capture.mainError", { error: errInfo(e) }))
  .finally(() => finish("completed"));
