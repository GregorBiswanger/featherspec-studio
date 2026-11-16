import type { RunStatus, RunView } from '../../runtime/model';
import { run as boardRun } from '../../board/testing/boardWorld';

export interface RunInput {
    id: string;
    stem: string;
    status?: RunStatus;
    created?: string;
    history?: { status: RunStatus; at: string }[];
    unreadable?: boolean;
    errorMessage?: string;
}

export function makeRun(input: RunInput): RunView {
    const created = input.created ?? '2026-11-16T10:00:00.000Z';
    return boardRun(input.id, input.stem, {
        providerId: 'fake',
        status: input.status ?? 'Running',
        created,
        statusHistory: input.history ?? [{ status: input.status ?? 'Running', at: created }],
        historyUnreadable: input.unreadable ?? false,
        errorMessage: input.errorMessage,
        result: input.errorMessage === undefined ? undefined : { secret: input.errorMessage, prompt: 'SECRET-PROMPT' },
    });
}
