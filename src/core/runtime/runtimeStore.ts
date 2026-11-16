import type { Disposable } from '../ports/host';
import type {
    CredentialValuesPort,
    IdSource,
    RuntimeClock,
    RuntimeMedium,
    RuntimeNoticePort,
} from '../ports/runtimeMedium';
import { encodeLine, parseRunRecord, type CreatedRecord, type RunRecord, type StatusRecord } from './records';
import {
    FORMAT_VERSION,
    NOT_AVAILABLE,
    RuntimeRefusal,
    isEndStatus,
    isRunStatus,
    type RunStatus,
    type AppendOutcome,
    ClearResult,
    CreateRunInput,
    EventInput,
    JsonValue,
    ReadResult,
    RunQuery,
    RunView,
    SpecStatusRecord,
    StatusReport,
    StoreState,
    StoredEvent,
} from './model';

export interface RuntimeStoreDeps {
    medium: RuntimeMedium;
    ids: IdSource;
    clock: RuntimeClock;
    notices: RuntimeNoticePort;
    credentials: CredentialValuesPort;
    projectRoot: string;
    maxAgeDays: () => unknown;
    maxEventsPerRun?: number;
}

export interface RuntimeStore {
    state(): StoreState;
    onDidChangeState(listener: (state: StoreState) => void): Disposable;
    createRun(input: CreateRunInput): Promise<RunView>;
    reportStatus(runId: string, status: string, report?: StatusReport): Promise<RunView>;
    listRuns(query?: RunQuery): Promise<ReadResult<RunView[]>>;
    getRun(runId: string): Promise<ReadResult<RunView | undefined>>;
    appendEvent(runId: string, event: EventInput): Promise<AppendOutcome>;
    readEvents(runId: string, fromSeq: number, size: number): Promise<ReadResult<StoredEvent[]>>;
    appendSpecStatusEntry(stem: string, entry: JsonValue): Promise<void>;
    readSpecStatusHistory(stem?: string): Promise<ReadResult<SpecStatusRecord[]>>;
    clear(): Promise<ClearResult>;
    dispose(): Promise<void>;
}

const RUN_FILE_SUFFIX = '.run.jsonl';
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

interface RunEntry {
    view: MutableRun;
    order: number;
    tailUnterminated: boolean;
}

type MutableRun = {
    -readonly [Key in keyof RunView]: RunView[Key];
};

function runFileName(runId: string): string {
    return `runs/${runId}${RUN_FILE_SUFFIX}`;
}

function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function copyView(view: MutableRun): RunView {
    return { ...view, spec: { ...view.spec }, statusHistory: view.statusHistory.map((entry) => ({ ...entry })) };
}

function applyStatus(view: MutableRun, record: StatusRecord): void {
    const entry: { status: RunStatus; at: string; cause?: string } = { status: record.status, at: record.at };
    if (record.cause !== undefined) {
        entry.cause = record.cause;
    }
    (view.statusHistory as { status: RunStatus; at: string; cause?: string }[]).push(entry);
    view.status = record.status;
    if (record.status === 'Running' && view.started === undefined) {
        view.started = record.at;
    }
    if (record.model !== undefined) {
        view.model = record.model;
    }
    if (record.sessionRef !== undefined) {
        view.sessionRef = record.sessionRef;
    }
    if (isEndStatus(record.status)) {
        view.ended = record.at;
        view.errorClass = record.errorClass;
        view.errorMessage = record.errorMessage;
        view.result = record.result;
    }
}

function newView(record: CreatedRecord): MutableRun {
    const view: MutableRun = {
        runId: record.runId,
        providerId: record.providerId,
        model: record.model ?? NOT_AVAILABLE,
        spec: { stem: record.spec.stem, path: record.spec.path },
        sessionRef: record.sessionRef,
        status: 'Starting',
        statusHistory: [{ status: 'Starting', at: record.at }],
        created: record.at,
        started: undefined,
        ended: undefined,
        errorClass: undefined,
        errorMessage: undefined,
        result: undefined,
        historyIncomplete: false,
        historyUnreadable: false,
        newerVersion: false,
    };
    return view;
}

function unreadableView(runId: string, newer: boolean): MutableRun {
    return {
        runId,
        providerId: '',
        model: NOT_AVAILABLE,
        spec: { stem: '', path: '' },
        sessionRef: undefined,
        status: 'Starting',
        statusHistory: [],
        created: '',
        started: undefined,
        ended: undefined,
        errorClass: undefined,
        errorMessage: undefined,
        result: undefined,
        historyIncomplete: false,
        historyUnreadable: true,
        newerVersion: newer,
    };
}

async function replayRun(runId: string, medium: RuntimeMedium): Promise<{ entry: RunEntry }> {
    const lines: { text: string; terminated: boolean }[] = [];
    for await (const line of medium.lines(runFileName(runId))) {
        lines.push(line);
    }
    let view: MutableRun | undefined;
    let tailUnterminated = false;
    let broken = false;
    let newer = false;
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]!;
        const parsed = parseRunRecord(line.text);
        const isLast = index === lines.length - 1;
        if (parsed.kind === 'newer') {
            newer = true;
            break;
        }
        if (parsed.kind === 'broken') {
            if (isLast && !line.terminated) {
                tailUnterminated = true;
                break;
            }
            broken = true;
            break;
        }
        const record: RunRecord = parsed.record;
        if (!line.terminated) {
            tailUnterminated = true;
        }
        if (record.k === 'created') {
            if (view !== undefined || record.runId !== runId) {
                broken = true;
                break;
            }
            view = newView(record);
        } else if (view === undefined) {
            broken = true;
            break;
        } else if (record.k === 'status') {
            applyStatus(view, record);
        } else {
            view.historyIncomplete = true;
        }
    }
    if (newer || broken || view === undefined) {
        return { entry: { view: unreadableView(runId, newer), order: 0, tailUnterminated: false } };
    }
    return { entry: { view, order: 0, tailUnterminated } };
}

export async function openRuntimeStore(deps: RuntimeStoreDeps): Promise<RuntimeStore> {
    const { medium, clock } = deps;
    const runs = new Map<string, RunEntry>();
    const queues = new Map<string, Promise<void>>();
    const stateListeners = new Set<(state: StoreState) => void>();
    let currentState: StoreState = { kind: 'writable', reason: undefined };
    let orderCounter = 0;

    const iso = (): string => new Date(clock.epochMs()).toISOString();

    function enqueue(name: string, action: () => Promise<void>): Promise<string | undefined> {
        const previous = queues.get(name) ?? Promise.resolve();
        const outcome = previous.then(action).then(
            () => undefined,
            (error: unknown) => describeError(error),
        );
        queues.set(name, outcome.then(() => undefined));
        return outcome;
    }

    await medium.open();
    const names = (await medium.list('runs')).filter((name) => name.endsWith(RUN_FILE_SUFFIX));
    const loaded: RunEntry[] = [];
    for (const name of names) {
        const runId = name.slice('runs/'.length, name.length - RUN_FILE_SUFFIX.length);
        loaded.push((await replayRun(runId, medium)).entry);
    }
    loaded.sort((a, b) => a.view.created.localeCompare(b.view.created) || a.view.runId.localeCompare(b.view.runId));
    for (const entry of loaded) {
        entry.order = orderCounter++;
        runs.set(entry.view.runId, entry);
    }

    function requireRun(runId: string): RunEntry {
        const entry = runs.get(runId);
        if (entry === undefined) {
            throw new RuntimeRefusal('unknown-run', `The run store holds no run ${runId}.`);
        }
        return entry;
    }

    function notImplemented(): never {
        throw new Error('Not implemented');
    }

    return {
        state: () => currentState,
        onDidChangeState(listener) {
            stateListeners.add(listener);
            return { dispose: () => void stateListeners.delete(listener) };
        },
        async createRun(input) {
            const runId = deps.ids.newId();
            if (!SAFE_ID.test(runId)) {
                throw new RuntimeRefusal('storage-failed', `Run ID ${runId} is not a safe file name.`);
            }
            const record: CreatedRecord = {
                v: FORMAT_VERSION,
                k: 'created',
                runId,
                providerId: input.providerId,
                spec: { stem: input.spec.stem, path: input.spec.path },
                at: iso(),
            };
            if (input.model !== undefined) {
                record.model = input.model;
            }
            if (input.sessionRef !== undefined) {
                record.sessionRef = input.sessionRef;
            }
            const entry: RunEntry = { view: newView(record), order: orderCounter++, tailUnterminated: false };
            runs.set(runId, entry);
            const failure = await enqueue(runFileName(runId), () => medium.append(runFileName(runId), encodeLine(record)));
            if (failure !== undefined) {
                runs.delete(runId);
                throw new RuntimeRefusal('storage-failed', `The run could not be stored: ${failure}`);
            }
            return copyView(entry.view);
        },
        async reportStatus(runId, status, report = {}) {
            const entry = requireRun(runId);
            if (!isRunStatus(status)) {
                throw new RuntimeRefusal('invalid-status', `Status ${status} is not in the closed list of run statuses.`);
            }
            const record: StatusRecord = { v: FORMAT_VERSION, k: 'status', status, at: iso() };
            if (report.cause !== undefined) {
                record.cause = report.cause;
            }
            if (report.model !== undefined) {
                record.model = report.model;
            }
            if (report.sessionRef !== undefined) {
                record.sessionRef = report.sessionRef;
            }
            if (report.errorClass !== undefined) {
                record.errorClass = report.errorClass;
            }
            if (report.errorMessage !== undefined) {
                record.errorMessage = report.errorMessage;
            }
            if (report.result !== undefined) {
                record.result = report.result;
            }
            applyStatus(entry.view, record);
            await enqueue(runFileName(runId), () => medium.append(runFileName(runId), encodeLine(record)));
            return copyView(entry.view);
        },
        async listRuns(query = {}) {
            const selected = [...runs.values()]
                .filter((entry) => query.stem === undefined || entry.view.spec.stem === query.stem)
                .sort((a, b) => b.view.created.localeCompare(a.view.created) || b.order - a.order);
            return { available: true, value: selected.map((entry) => copyView(entry.view)) };
        },
        async getRun(runId) {
            const entry = runs.get(runId);
            return { available: true, value: entry === undefined ? undefined : copyView(entry.view) };
        },
        appendEvent: async () => notImplemented(),
        readEvents: async () => notImplemented(),
        appendSpecStatusEntry: async () => notImplemented(),
        readSpecStatusHistory: async () => notImplemented(),
        clear: async () => notImplemented(),
        async dispose() {
            stateListeners.clear();
        },
    };
}
