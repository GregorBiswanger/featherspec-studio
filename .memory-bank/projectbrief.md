# Project Brief

## Mission
Visual command center for spec-driven development with FeatherSpec: see every spec, know its next step.

A VS Code panel for projects that use FeatherSpec. Studio reads your specs, plans and Memory Bank, shows where every spec stands, and names each spec's next FeatherSpec step, ready to paste into the AI assistant you work with. It starts no agent; the work with the agent stays in the assistant's chat. The FeatherSpec artifacts stay the source of truth.
Product concept and decisions: [docs/product/po-handoff.md](../docs/product/po-handoff.md), PD-055 and PD-056 in [docs/product/product-decisions.md](../docs/product/product-decisions.md).

## Primary users
- Primary: developers working spec-driven with coding agents (GitHub Copilot, Claude Code, or any other); software architects; tech leads steering agent-assisted work.
- Secondary: product owners, engineering managers, AI engineers.

## Success criteria
The product succeeds when this scenario works (spec 0015 AC-030, checked by Gregor on `tip-splitter`): open a FeatherSpec project, Mission Control shows the state, the Spec Board shows specs in the correct columns, a spec's detail names its next step, Copy puts the line on the clipboard and pasting it into the assistant's chat works, and moving a Ready spec to Active starts nothing and shows the next step.
