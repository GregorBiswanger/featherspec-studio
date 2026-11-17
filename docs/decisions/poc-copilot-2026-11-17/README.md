# FeatherSpec Studio – Copilot SDK PoC (ADR-003 §7 A, spec 0010 M-01…M-09)

- `package.json` / `package-lock.json`: ESM package, only dependency `@github/copilot-sdk` pinned to 1.0.34.
- `preflight.mjs`: no SDK and no network. Reports the Node version, `copilot` on PATH (with `--version`), the SDK runtime lookup and whether login files exist (it checks existence only and prints no contents). Writes JSON to stdout and to `preflight.json`.
- `poc.mjs`: runs these steps in order, each with a timeout: start the runtime (the installed CLI, falling back to the bundled one) → status/auth → `listModels` → session in `./scratch` (manual mode, deny-all handler) → "ok" prompt → `hello.txt` prompt (the permission request must be denied and the file must not exist) → abort a long prompt → resume in a fresh client → login probe with an empty `baseDirectory`.
- Outputs: `events-copilot.jsonl` (one redacted line per event, text cut to 200 chars) and `report.json` (M-01…M-09 with pass, fail or not-run plus a reason).
- Telemetry is off (`COPILOT_TELEMETRY_DISABLED=true`, `enableSessionTelemetry:false`). Token env vars are removed from the runtime env, so auth comes only from the signed-in login.
- The run is non-interactive, ends in under 4 minutes and always exits with code 0. The runtime also writes to `~/.copilot` (sessions, logs), as the CLI does.
- Options: `node poc.mjs --runtime=bundled|installed` (default `auto`).

Run once after `npm install`:

    node preflight.mjs
    node poc.mjs

Send back `preflight.json`, `report.json` and `events-copilot.jsonl`. Check them for account names before they go into the repo.
