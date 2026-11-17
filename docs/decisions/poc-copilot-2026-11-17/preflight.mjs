// FeatherSpec Studio - Copilot PoC preflight. No SDK needed, no network.
// Reports: Node version, `copilot` on PATH (+ --version), where the SDK would
// look for a runtime, and whether the usual login state exists (existence only).
// Never prints tokens or file contents. Exit code is always 0.
import { existsSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const isWin = process.platform === "win32";
const SDK_VERSION = "1.0.34";
// From node_modules/@github/copilot-sdk/dist/cliVersion.js and sdkProtocolVersion.d.ts of 1.0.34.
const SDK_EXPECTS_CLI = "1.0.112";
const SDK_PROTOCOL_VERSION = 3;

function redact(s) {
  if (typeof s !== "string") return s;
  let out = s
    .replace(/\b(gh[opusr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,})/g, "[REDACTED_TOKEN]")
    .replace(/(bearer|token)\s+[A-Za-z0-9._-]{16,}/gi, "$1 [REDACTED]");
  if (HOME) out = out.split(HOME).join("~");
  return out.length > 200 ? out.slice(0, 200) + "...[truncated]" : out;
}

function pathInfo(p) {
  try {
    const st = statSync(p);
    return { path: redact(p), exists: true, type: st.isDirectory() ? "dir" : "file" };
  } catch {
    return { path: redact(p), exists: false };
  }
}

function findOnPath(name) {
  const dirs = (process.env.PATH || process.env.Path || "").split(delimiter).filter(Boolean);
  const exts = isWin
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").map((e) => e.toLowerCase()).concat([".ps1", ""])
    : [""];
  const hits = [];
  for (const d of dirs) {
    for (const e of exts) {
      const p = join(d, name + e);
      try {
        if (statSync(p).isFile()) hits.push(p);
      } catch { /* not there */ }
    }
  }
  return [...new Set(hits)];
}

// Turns a PATH hit into something spawnable without a shell, the way the SDK would
// need it: a native executable, or the npm package's JS entry run by node.
function spawnTarget(hit) {
  const lower = hit.toLowerCase();
  if (isWin && (lower.endsWith(".cmd") || lower.endsWith(".bat") || lower.endsWith(".ps1") || !/\.[a-z0-9]+$/.test(lower))) {
    const loader = join(dirname(hit), "node_modules", "@github", "copilot", "npm-loader.js");
    if (existsSync(loader)) return { kind: "npm-js", path: loader };
    return { kind: "shim-unresolved", path: hit };
  }
  if (!isWin) {
    // npm global bin on unix is a symlink; spawning it directly works.
    return { kind: "executable", path: hit };
  }
  return { kind: "executable", path: hit };
}

function runVersion(target) {
  if (target.kind === "shim-unresolved") return { ran: false, reason: "shim without resolvable npm-loader.js; not spawned (no shell)" };
  const cmd = target.kind === "npm-js" ? process.execPath : target.path;
  const args = target.kind === "npm-js" ? [target.path, "--version"] : ["--version"];
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  return {
    ran: true,
    exitCode: r.status,
    signal: r.signal || undefined,
    error: r.error ? redact(r.error.message) : undefined,
    stdout: redact((r.stdout || "").trim()),
    stderr: redact((r.stderr || "").trim()) || undefined,
  };
}

const report = { tool: "featherspec-studio copilot preflight", time: new Date().toISOString() };
try {
  report.node = { version: process.version, platform: process.platform, arch: process.arch, execPath: redact(process.execPath) };
  report.sdk = {
    pinned: SDK_VERSION,
    expectsCliVersion: SDK_EXPECTS_CLI,
    protocolVersion: SDK_PROTOCOL_VERSION,
    installedHere: pathInfo(join(HERE, "node_modules", "@github", "copilot-sdk", "package.json")),
  };

  const hits = findOnPath("copilot");
  report.copilotOnPath = {
    found: hits.length > 0,
    candidates: hits.map((h) => {
      const t = spawnTarget(h);
      return { hit: redact(h), spawnTarget: { kind: t.kind, path: redact(t.path) }, version: runVersion(t) };
    }),
  };

  // Where the SDK 1.0.34 looks (client.js / runtimeArtifacts.js): explicit
  // RuntimeConnection.forStdio({path}) or env COPILOT_CLI_PATH, else the bundled
  // platform package @github/copilot-sdk-<platform>/prebuilds/<platform>/copilot-runtime[.exe].
  const plat = `${process.platform}-${process.arch}`;
  const wrapper = isWin ? "copilot-runtime.exe" : "copilot-runtime";
  const localAppData = process.env.LOCALAPPDATA || join(HOME, "AppData", "Local");
  const cacheRoot = isWin ? localAppData : process.platform === "darwin" ? join(HOME, "Library", "Caches") : (process.env.XDG_CACHE_HOME || join(HOME, ".cache"));
  report.sdkRuntimeLookup = {
    order: ["connection.path", "env COPILOT_CLI_PATH", "bundled platform package"],
    COPILOT_CLI_PATH: process.env.COPILOT_CLI_PATH ? pathInfo(process.env.COPILOT_CLI_PATH) : { set: false },
    bundledWrapper: pathInfo(join(HERE, "node_modules", "@github", `copilot-sdk-${plat}`, "prebuilds", plat, wrapper)),
    bundledRuntimeNode: pathInfo(join(HERE, "node_modules", "@github", `copilot-sdk-${plat}`, "prebuilds", plat, "runtime.node")),
    runtimeCacheDir: pathInfo(join(cacheRoot, "github-copilot-sdk", "runtime")),
  };

  const copilotHome = process.env.COPILOT_HOME || join(HOME, ".copilot");
  const appData = process.env.APPDATA || join(HOME, "AppData", "Roaming");
  const ghConfigDir = process.env.GH_CONFIG_DIR || (isWin ? join(appData, "GitHub CLI") : join(process.env.XDG_CONFIG_HOME || join(HOME, ".config"), "gh"));
  report.loginState = {
    note: "existence only; contents never read. Copilot CLI may keep the OAuth token in the OS credential store, so a missing file does not prove signed-out.",
    COPILOT_HOME_env_set: Boolean(process.env.COPILOT_HOME),
    copilotHome: pathInfo(copilotHome),
    copilotConfigJson: pathInfo(join(copilotHome, "config.json")),
    copilotSessionState: pathInfo(join(copilotHome, "session-state")),
    copilotLogs: pathInfo(join(copilotHome, "logs")),
    ghHostsYml: pathInfo(join(ghConfigDir, "hosts.yml")),
    tokenEnvVarsSet: {
      COPILOT_GITHUB_TOKEN: Boolean(process.env.COPILOT_GITHUB_TOKEN),
      GH_TOKEN: Boolean(process.env.GH_TOKEN),
      GITHUB_TOKEN: Boolean(process.env.GITHUB_TOKEN),
    },
  };
} catch (e) {
  report.error = redact(e && e.message ? e.message : String(e));
}

const json = JSON.stringify(report, null, 2);
process.stdout.write(json + "\n");
try { writeFileSync(join(HERE, "preflight.json"), json + "\n"); } catch { /* stdout is the report */ }
process.exitCode = 0;
