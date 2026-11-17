import type { AgentCenterView, DetailView, RunRowView } from '../agentCenter';

export function sampleRow(overrides: Partial<RunRowView> = {}): RunRowView {
    return {
        runId: 'run-1',
        spec: { stem: '0007-board', number: '0007', title: 'Spec Board', found: true },
        provider: 'Fake provider',
        status: 'Running',
        started: '2026-11-17T10:00:00.000Z',
        ended: undefined,
        historyIncomplete: false,
        historyUnreadable: false,
        selected: true,
        ...overrides,
    };
}

export function sampleDetail(overrides: Partial<DetailView> = {}): DetailView {
    return {
        header: {
            runId: 'run-1',
            provider: 'Fake provider',
            model: 'fake-model',
            session: 'fake-session-run-1',
            spec: { stem: '0007-board', number: '0007', title: 'Spec Board', found: true },
            status: 'WaitingForApproval',
            cause: undefined,
            started: '2026-11-17T10:00:00.000Z',
            ended: undefined,
        },
        unreadable: false,
        activity: 'Waiting for approval: Edit README.md',
        error: undefined,
        result: undefined,
        files: [{ path: 'README.md', operation: 'changed', basis: 'reported by provider', outsideProject: false, canOpen: true }],
        notes: [],
        requests: [{ kind: 'approval', requestId: 'a1', actionKind: 'edit', summary: 'Edit README.md', question: '', outsideProject: false, pending: false, refusal: undefined }],
        actions: { cancel: 'offer', cancelNote: undefined, resume: false, openSpec: true, refusal: undefined },
        ...overrides,
    };
}

export function sampleCenterView(overrides: Partial<Extract<AgentCenterView, { kind: 'ready' }>> = {}): AgentCenterView {
    return {
        kind: 'ready',
        controls: { kind: 'enabled' },
        filter: undefined,
        notice: undefined,
        empty: undefined,
        rows: [sampleRow()],
        detail: sampleDetail(),
        ...overrides,
    };
}
