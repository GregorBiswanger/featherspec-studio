# Panel survives dynamic plugin loading

**Status:** Backlog

Found while verifying 0034 in CI. IntelliJ IDEA 2026.3 (unified) can load and unload bundled plugins at runtime: in CI, about
40 s after start, the JetBrains Ultimate module was loaded and indexing ran. A Studio tab opened inside that window reached
Ready but received no panel frame (CI runs 45866766685 and, earlier, 5282ba4). Cause not analysed yet.

## 1. Problem

The panel shows nothing when a tab opens while a bundled plugin is loaded or unloaded at runtime, although the core is
Ready. The user has to reopen the tab to see the panel.

## 2. Goal

After a dynamic plugin load or unload, the panel recovers by itself: it re-sends its shell or re-attaches to the core,
without the user reopening the tab.

## 3. Draft acceptance criteria

- **AC-001** A Studio tab opened while the IDE loads or unloads a bundled plugin shows the panel frame within the 1 s budget
  of 0034 AC-007 after Ready.
- **AC-002** After a dynamic plugin load or unload, the panel re-sends its shell when the core is Ready, and the tree and the
  status entry keep following the spec files (0034 AC-008, AC-020).
- **AC-003** A CI smoke check reproduces the window: it starts the IDE, opens the Studio tab about 40 s after start and fails
  when no panel frame arrives within the budget of AC-001.

## 4. Out of scope

- Changes to the core (`src/core/`); the fix lives in the JetBrains host.
- Whether IntelliJ IDEA 2025.3.1 is affected; it is only checked by the same smoke check.
