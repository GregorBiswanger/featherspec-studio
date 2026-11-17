import type { CapabilityGap, PreviousRunView, RefusalItem } from '../../shared/protocol/agentStart';

export const OPEN_RUN_LABEL = 'Open run';

export function checkingText(number: string): string {
    return `Checking whether an agent can start on spec ${number}…`;
}

export function refusalLines(item: RefusalItem): string[] {
    switch (item.id) {
        case 'P-1':
            if (item.kind === 'transition') {
                return [`P-1 The board does not accept this start: ${item.text}`];
            }
            return [item.kind === 'no-entry' ? `P-1 No spec carries the stem ${item.stem}.` : `P-1 Several specs carry the stem ${item.stem}.`];
        case 'P-2':
            return item.missing.map((path) => `P-2 Missing FeatherSpec file: ${path}.`);
        case 'P-3':
            return [item.configured === undefined ? 'P-3 No provider configured.' : `P-3 The default provider ${item.configured} is not registered.`];
        case 'P-4':
            return [`P-4 ${item.provider} is not available: ${item.result}.${item.reason === undefined ? '' : ` ${item.reason}`}${item.hint === undefined ? '' : ` ${item.hint}`}`];
        case 'P-5':
            return [`P-5 Run ${item.runId} of spec ${item.stem} is still open.`];
        case 'P-6':
            return [`P-6 The run history cannot be written: ${item.reason ?? item.state}`];
        case 'P-7':
            return ['P-7 Restricted Mode: trust this workspace to start an agent.'];
        case 'P-8':
            return [`P-8 The stem ${item.stem} is not of the form NNNN-slug.`];
        case 'pending':
            return ['Another start is still being prepared.'];
        case 'outdated':
            return ['The provider, model or permission mode changed since the confirmation opened. Start again.'];
        case 'orchestrator':
            return [item.text];
    }
}

export function noticeText(runId: string, errorClass: string): string {
    return `Run ${runId} failed to start: ${errorClass}.`;
}

export const START_LABEL = 'Start';
export const CANCEL_LABEL = 'Cancel';
export const SHOW_PROMPT_LABEL = 'Show start prompt';
export const HIDE_PROMPT_LABEL = 'Hide start prompt';
export const MODEL_FALLBACK = 'provider default';
export const NO_PREVIOUS_RUN = 'No run';
export const FIELD_LABELS = {
    spec: 'Spec',
    provider: 'Provider',
    model: 'Model',
    permissionMode: 'Permission mode',
    previousRun: 'Previous run',
    prompt: 'Start prompt',
} as const;

export function dialogTitle(number: string): string {
    return `Start an agent on spec ${number}?`;
}

export function capabilityLine(gap: CapabilityGap): string {
    return gap === 'approvals' ? 'This provider cannot ask for approval before it acts.' : 'This provider cannot ask you questions, so the agent cannot wait for your answer.';
}

export function previousRunText(previous: PreviousRunView): string {
    if (previous.kind === 'none') {
        return NO_PREVIOUS_RUN;
    }
    if (previous.kind === 'not-available') {
        return `Not available: ${previous.reason}`;
    }
    const detail = previous.status === 'Failed' ? `${previous.errorClass}: ${previous.errorText}` : undefined;
    return `${previous.runId}, ${previous.status}${detail === undefined ? '' : `, ${detail}`}`;
}
