export interface StartPromptInput {
    stem: string;
    specPath: string;
    planPath: string;
}

const TEMPLATE = [
    'Read `AGENTS.md` first, completely; it is binding. Start signal from the human, given by confirming the start in FeatherSpec Studio: implement the whole plan of spec `<stem>` (`<spec path>`, plan `<plan path>`). This is the explicit start signal of `.claude/commands/sdd-plan.md`.',
    '1. Do the backlog → active move by following `.claude/commands/sdd-lifecycle.md` exactly. This start signal is the yes to its move proposal.',
    '2. Then implement the plan per `.claude/rules/plans.md` until its status is Done. Any stop that a working agreement in `AGENTS.md` requires (for example the test review per stage) still applies: ask, then wait.',
    '3. If you are blocked, set the plan to Blocked as the rules say, and stop with the reason.',
    '4. Stop when the plan is Done. Do not run `/sdd-compile` and do not move the spec to `done/`: the human does that.',
    '',
    'Git: the `git mv` that `/sdd-lifecycle` uses for the move is allowed. Make no commit and no other git write in this run; list your commit proposals in your final report.',
    '',
    'When a command is named, read its file under `.claude/commands/` and follow it as if the user had typed it.',
].join('\n');

export function buildStartPrompt(input: StartPromptInput): string {
    return TEMPLATE.replace('<stem>', () => input.stem)
        .replace('<spec path>', () => input.specPath)
        .replace('<plan path>', () => input.planPath);
}
