# Status history: what FeatherSpec Studio stores

FeatherSpec Studio keeps one local record: the status history of your specs. It is runtime data, not spec content: it never goes into your repository, and Studio never writes to `.specs/`, `.memory-bank/`, `AGENTS.md` or any other file of your workspace.

## What is stored

- **Spec status history:** each change of a spec's state that Studio observed while it was running, with the time. Nothing else.
- Studio stores no credentials, no prompts and no agent output. Studio starts no agent and has nothing of the kind to store.

## Where it is stored

On your machine, outside every workspace folder, in VS Code's global storage of the extension:

```
<VS Code user data>/User/globalStorage/<extension id>/featherspec-studio/projects/<project id>/
```

`<project id>` is derived from the project's root folder URI, so every VS Code window and workspace that opens the same project sees the same history. A moved, renamed or cloned folder starts with an empty history. A different project placed at the same path inherits the history of the old one; delete it (see below) when that happens. In a remote window the data lives on the machine where the extension runs.

The folder holds `store.json` (format version), `spec-status-history.jsonl` (the history) and `lock.json` (which window writes). All files are plain text; nothing is sent anywhere.

## How long

Entries older than **90 days** are removed when Studio starts in a project. The age cap is fixed; there is no setting for it.

## Data from earlier versions

Earlier builds of Studio could start agents and stored their runs. At every start Studio removes what those builds left: the `copilot-home` folder, `index.json` (and any `index.json.tmp-*`), the `runs/` folder, and the workspace-state key `featherspec-studio.agentCenter`. This happens before the status history opens. A folder whose `store.json` names another format version is left alone.

## Deleting by hand

Close VS Code, then delete the project's folder shown above, or the whole `featherspec-studio` folder to remove the history of every project. Studio recreates what it needs.

## One window writes

Only one VS Code window writes a project's status history. A second window with the same project reads it and says so; the reason is "Another VS Code window holds the write lock for this project's status history." A lock that has not been refreshed for 60 seconds counts as abandoned and is taken over. When a window closes the history, it first finishes the writes it started, then releases the lock; it writes nothing after that. On Windows, a file that another program briefly holds open (a virus scanner, a second window reading it) is retried for about half a second before the write counts as failed.

## When storing goes wrong

- **A write fails:** you get a warning that names the spec; the lost entry is not written later. Studio keeps working.
- **A record was cut off** (VS Code was killed mid-write): that record is skipped wherever it stands in the file, the rest is shown, and a notice says so once per start. Studio never changes bytes that are already stored; it only appends to them or removes them as a whole. Every new record starts on a fresh line, so records written after a cut-off record stay readable.
- **The storage location cannot be reached:** the status history is "not available" in this window, with a notice and the reason. The rest of Studio works.
- **Data from a newer Studio version:** it is left unchanged and not shown until you update Studio.
