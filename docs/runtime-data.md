# Run history: what FeatherSpec Studio stores

FeatherSpec Studio keeps its own local record of agent runs. It is runtime data, not spec content: it never goes into your repository, and Studio never writes to `.specs/`, `.memory-bank/`, `AGENTS.md` or any other file of your workspace.

## What is stored

- **Runs:** a run ID, the provider, the model (shown as "not available" when the provider delivers none), the spec the run belongs to (stem and path as they were when the run started), every status the run went through with its time and cause, the end time, and a result or error.
- **Events:** what the agent did during a run, in order, one numbered record per event.
- **Spec status history:** the status entries Studio records for each spec.
- Studio stores no credentials. Secrets that it recognises are replaced by `[masked]` before anything is written (see *Masking*).

## Where it is stored

On your machine, outside every workspace folder, in VS Code's global storage of the extension:

```
<VS Code user data>/User/globalStorage/<extension id>/featherspec-studio/projects/<project id>/
```

`<project id>` is derived from the project's root folder URI, so every VS Code window and workspace that opens the same project sees the same history. A moved, renamed or cloned folder starts with an empty history. A different project placed at the same path inherits the history of the old one; delete it (see below) when that happens. In a remote window the data lives on the machine where the extension runs.

The folder holds `store.json` (format version), `index.json` (list of runs, rebuilt when unreadable), `runs/<run id>.run.jsonl` and `runs/<run id>.events.jsonl` (one run each), `spec-status-history.jsonl` and `lock.json` (which window writes). All files are plain text; nothing is sent anywhere.

## How long

Ended runs, their events and spec status history entries are removed when Studio starts in a project, once they are older than the age cap: **90 days** by default, set with `featherspec-studio.runHistory.maxAgeDays` (whole days, at least 1). A run's age counts from its end time. A run that was open when VS Code closed is marked `Interrupted` at the next start, and its 90 days start then. Runs that are still open and runs with unreadable data are never removed by the cap.

## Clearing and deleting by hand

- **Clear:** run `FeatherSpec Studio: Clear Run History`. After a confirmation Studio removes, for the active project, all ended runs with their events, all runs with unreadable data and all spec status history entries. Runs still open are kept. If a run cannot be removed, Studio says how many stayed.
- **By hand:** close VS Code, then delete the project's folder shown above, or the whole `featherspec-studio` folder to remove the history of every project. Studio recreates what it needs.

## One window writes

Only one VS Code window writes a project's history. A second window with the same project reads it and says that it cannot start or change runs; the reason is "Another VS Code window holds the write lock for this project's run history." A lock that has not been refreshed for 60 seconds counts as abandoned and is taken over. When a window closes the history, it first finishes the writes it started, then releases the lock; it writes nothing after that. On Windows, a file that another program briefly holds open (a virus scanner, a second window reading it) is retried for about half a second before the write counts as failed.

## When storing goes wrong

- **A write fails during a run:** the agent keeps working. The run is flagged "history incomplete", you get one warning per run that names the spec and the run ID, and the lost records are not written later. A run whose final status could not be saved shows as `Interrupted` after a restart.
- **A stored run cannot be read:** that run is shown as "history unreadable" and a notice names it. Other runs are not affected and the data is left as it is; Studio refuses to write to that run, and `Clear Run History` removes it.
- **A record was cut off** (VS Code was killed mid-write): that record is skipped wherever it stands in the file, the rest is shown, and a notice says so once per run and start. Studio never changes bytes that are already stored in a run's files; it only appends to them or removes them as a whole. Every new record starts on a fresh line, so records written after a cut-off record stay readable, and a run that was open shows as `Interrupted` after the next start.
- **The storage location cannot be reached:** the run history is "not available" in this window, with a notice and the reason; no run can be started.
- **Data from a newer Studio version:** it is left unchanged, not shown, and no run can be started until you update Studio.
- **Too many events in one run:** after 20,000 events Studio stores one `truncated` event and no further events for that run; status changes are still stored.

## Masking

Before writing, Studio replaces credentials it holds and text matching the patterns in [`docs/security/secret-patterns.md`](security/secret-patterns.md) (provider tokens, bearer tokens, private-key blocks) with `[masked]`. Masking is **best effort**: a secret split across two events, or one that no pattern describes, is not recognised. Studio does not read `.env` files. Do not rely on the run history being free of secrets; delete it or clear it when in doubt.
