import { COPY_FAILED_TEXT, COPY_PROMPT_LABEL, stepShortForm } from '../../shared/protocol/nextStepTexts';
import { SETUP_LINE } from '../../shared/protocol/texts';
import type { HandOverPort } from '../assistant/handOver';
import { copyLine } from '../board/copyLine';
import type { StepPickItem, StepUiPort } from '../ports/copyNextStep';
import type { ClipboardPort } from '../ports/board';
import { NO_STEP_COPY_LINE, NO_STEP_MESSAGE, NO_STEP_SETUP_MESSAGE, PICK_PLACEHOLDER } from './copyNextStepTexts';
import type { StatusEntry } from './statusEntry';

export interface CopyNextStepActions {
    selectProject(): Promise<void>;
    openStudio(): Promise<void>;
}

export interface CopyNextStepDeps {
    entry: Pick<StatusEntry, 'situation' | 'copied'>;
    clipboard: ClipboardPort;
    ui: StepUiPort;
    actions: CopyNextStepActions;
    handOver?: HandOverPort;
}

export interface CopyNextStep {
    run(): Promise<void>;
    copy(line: string): Promise<void>;
}

export function createCopyNextStep(deps: CopyNextStepDeps): CopyNextStep {
    async function copy(line: string): Promise<void> {
        const handOver = deps.handOver?.begin(line);
        const outcome = await copyLine(deps.clipboard, line);
        if (outcome.ok) {
            await handOver?.commit();
        }
        deps.entry.copied(outcome.ok);
        if (!outcome.ok) {
            deps.ui.warn(COPY_FAILED_TEXT);
        }
    }

    async function run(): Promise<void> {
        const situation = deps.entry.situation();
        switch (situation.kind) {
            case 'line':
                await deps.actions.selectProject();
                return;
            case 'notRead':
                await deps.actions.openStudio();
                return;
            case 'current':
                await copy(situation.spec.step.line);
                return;
            case 'none': {
                if (situation.steps.length === 0) {
                    const setup = situation.setupRun === 'not run';
                    const chosen = await deps.ui.inform(setup ? NO_STEP_SETUP_MESSAGE : NO_STEP_MESSAGE, COPY_PROMPT_LABEL);
                    if (chosen === COPY_PROMPT_LABEL) {
                        await copy(setup ? SETUP_LINE : NO_STEP_COPY_LINE);
                    }
                    return;
                }
                const items: StepPickItem[] = situation.steps.map((spec) => ({ key: spec.key, label: spec.label, description: `${spec.state} · ${stepShortForm(spec.step)}` }));
                const picked = await deps.ui.pick(items, PICK_PLACEHOLDER);
                const spec = picked === undefined ? undefined : situation.steps.find((candidate) => candidate.key === picked.key);
                if (spec !== undefined) {
                    await copy(spec.step.line);
                }
                return;
            }
        }
    }

    return { run, copy };
}
