import type { Disposable } from '../ports/host';
import type {
    CredentialValuesPort,
    IdSource,
    RuntimeClock,
    RuntimeMedium,
    RuntimeNoticePort,
} from '../ports/runtimeMedium';
import { createMasker } from './masking';
import { EXTENSION_HOST_RESTARTED, READER_REASON, storageUnreachableNotice } from './notices';
import { createWriterLock } from './writerLock';
import {
    encodeLine,
    parseEventRecord,
    parseHistoryRecord,
    type HistoryRecord,
    parseRunRecord,
    type CreatedRecord,
    type EventRecord,
    type RunRecord,
    type StatusRecord,
} from './records';
import {
    FORMAT_VERSION,
    HEARTBEAT_INTERVAL_MS,
    MAX_EVENTS_PER_RUN,
    MAX_PAGE_SIZE,
    NOT_AVAILABLE,
    RuntimeRefusal,
    isEndStatus,
    isRunStatus,
    normalizeMaxAgeDays,
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

interface EventState {
    nextSeq: number;
    count: number;
    ids: Set<string>;
    truncated: boolean;
    pending: EventRecord[];
    tailUnterminated: boolean;
}

interface RunEntry {
    view: MutableRun;
    order: number;
    tailUnterminated: boolean;
    events: EventState | undefined;
    eventsLoading: Promise<EventState> | undefined;
}

function emptyEventState(): EventState {
    return { nextSeq: 1, count: 0, ids: new Set(), truncated: false, pending: [], tailUnterminated: false };
}

function eventFileName(runId: string): string {
    return `runs/${runId}.events.jsonl`;
}

function toStoredEvent(record: EventRecord): StoredEvent {
    return {
        runId: record.runId,
        seq: record.seq,
        occurredAt: record.occurredAt,
        receivedAt: record.receivedAt,
        type: record.type,
        payload: record.payload,
        providerEventId: record.providerEventId,
    };
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
        return { entry: { view: unreadableView(runId, newer), order: 0, tailUnterminated: false, events: undefined, eventsLoading: undefined } };
    }
    return { entry: { view, order: 0, tailUnterminated, events: undefined, eventsLoading: undefined } };
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

    let readBlock: string | undefined;
    let writer = false;
    let disposed = false;
    let timer: Disposable | undefined;
    const ownerId = deps.ids.newId();
    const lock = createWriterLock(medium, clock, ownerId);
    const STORE_FILE = 'store.json';
    const HISTORY_FILE = 'spec-status-history.jsonl';

    function setState(next: StoreState): void {
        if (next.kind === currentState.kind && next.reason === currentState.reason) {
            return;
        }
        currentState = next;
        [...stateListeners].forEach((listener) => listener(next));
    }

    function assertWritable(): void {
        if (currentState.kind === 'writable') {
            return;
        }
        throw new RuntimeRefusal(currentState.kind === 'unavailable' ? 'unavailable' : 'read-only', currentState.reason ?? '');
    }

    function blocked(): { available: false; reason: string } | undefined {
        return readBlock === undefined ? undefined : { available: false, reason: readBlock };
    }

    async function loadRuns(): Promise<void> {
        const names = (await medium.list('runs')).filter((name) => name.endsWith(RUN_FILE_SUFFIX));
        const loaded: RunEntry[] = [];
        for (const name of names) {
            const runId = name.slice('runs/'.length, name.length - RUN_FILE_SUFFIX.length);
            loaded.push((await replayRun(runId, medium)).entry);
        }
        loaded.sort((a, b) => a.view.created.localeCompare(b.view.created) || a.view.runId.localeCompare(b.view.runId));
        runs.clear();
        for (const entry of loaded) {
            entry.order = orderCounter++;
            runs.set(entry.view.runId, entry);
        }
    }

    async function commitStatus(entry: RunEntry, record: StatusRecord): Promise<void> {
        applyStatus(entry.view, record);
        const name = runFileName(entry.view.runId);
        await enqueue(name, () => medium.append(name, encodeLine(record)));
    }

    async function classifyOpenRuns(): Promise<void> {
        const at = iso();
        for (const entry of runs.values()) {
            if (!entry.view.historyUnreadable && !isEndStatus(entry.view.status)) {
                await commitStatus(entry, { v: FORMAT_VERSION, k: 'status', status: 'Interrupted', at, cause: EXTENSION_HOST_RESTARTED });
            }
        }
    }

    async function removeRunFiles(runId: string): Promise<boolean> {
        const events = eventFileName(runId);
        const log = runFileName(runId);
        if ((await enqueue(events, () => medium.remove(events))) !== undefined) {
            return false;
        }
        return (await enqueue(log, () => medium.remove(log))) === undefined;
    }

    async function rewriteHistory(keep: (record: HistoryRecord) => boolean): Promise<void> {
        const lines: { text: string; terminated: boolean }[] = [];
        for await (const line of medium.lines(HISTORY_FILE)) {
            lines.push(line);
        }
        let removed = false;
        const kept = lines.filter((line) => {
            const parsed = parseHistoryRecord(line.text);
            const keepIt = parsed.kind !== 'record' || keep(parsed.record);
            removed ||= !keepIt;
            return keepIt;
        });
        if (removed) {
            const text = kept.map((line) => (line.terminated ? `${line.text}\n` : line.text)).join('');
            await enqueue(HISTORY_FILE, () => medium.replace(HISTORY_FILE, text));
        }
    }

    async function applyAgeCap(): Promise<void> {
        const cutoff = clock.epochMs() - normalizeMaxAgeDays(deps.maxAgeDays()) * 86_400_000;
        const cutoffIso = new Date(cutoff).toISOString();
        for (const entry of [...runs.values()]) {
            const ended = entry.view.ended;
            if (!entry.view.historyUnreadable && ended !== undefined && Date.parse(ended) < cutoff) {
                if (await removeRunFiles(entry.view.runId)) {
                    runs.delete(entry.view.runId);
                }
            }
        }
        await rewriteHistory((record) => record.observedAt >= cutoffIso);
    }

    async function ensureStoreDescriptor(): Promise<void> {
        if ((await medium.read(STORE_FILE)) === undefined) {
            const content = JSON.stringify({ storeVersion: FORMAT_VERSION, projectRoot: deps.projectRoot });
            await enqueue(STORE_FILE, () => medium.replace(STORE_FILE, content));
        }
    }

    async function becomeWriter(): Promise<void> {
        writer = true;
        await loadRuns();
        await ensureStoreDescriptor();
        await classifyOpenRuns();
        await applyAgeCap();
        setState({ kind: 'writable', reason: undefined });
    }

    function startTimer(): void {
        timer?.dispose();
        timer = clock.setTimeout(() => void tick(), HEARTBEAT_INTERVAL_MS);
    }

    async function tick(): Promise<void> {
        if (disposed) {
            return;
        }
        try {
            if (writer) {
                if (!(await lock.heartbeat())) {
                    writer = false;
                    setState({ kind: 'read-only', reason: READER_REASON });
                }
            } else if (readBlock === undefined) {
                await loadRuns();
                const peek = await lock.peek();
                if ((peek.kind === 'free' || peek.kind === 'stale') && (await lock.tryAcquire())) {
                    await becomeWriter();
                }
            }
        } catch {
            // a failed heartbeat or poll is retried at the next interval
        }
        if (!disposed) {
            startTimer();
        }
    }

    try {
        await medium.open();
    } catch (error) {
        readBlock = describeError(error);
        setState({ kind: 'unavailable', reason: readBlock });
        deps.notices.show(storageUnreachableNotice(readBlock));
    }
    if (readBlock === undefined) {
        if (await lock.tryAcquire()) {
            await becomeWriter();
        } else {
            await loadRuns();
            setState({ kind: 'read-only', reason: READER_REASON });
        }
        startTimer();
    }

    function requireRun(runId: string): RunEntry {
        const entry = runs.get(runId);
        if (entry === undefined) {
            throw new RuntimeRefusal('unknown-run', `The run store holds no run ${runId}.`);
        }
        return entry;
    }

    const masker = createMasker(deps.credentials);
    const eventCap = deps.maxEventsPerRun ?? MAX_EVENTS_PER_RUN;

    async function loadEventState(entry: RunEntry): Promise<EventState> {
        const state = emptyEventState();
        for await (const line of medium.lines(eventFileName(entry.view.runId))) {
            const parsed = parseEventRecord(line.text);
            if (parsed.kind !== 'record') {
                if (!line.terminated) {
                    state.tailUnterminated = true;
                }
                continue;
            }
            const record = parsed.record;
            state.nextSeq = Math.max(state.nextSeq, record.seq + 1);
            state.count += 1;
            if (record.providerEventId !== undefined) {
                state.ids.add(record.providerEventId);
            }
            if (record.type === 'truncated') {
                state.truncated = true;
            }
            if (!line.terminated) {
                state.tailUnterminated = true;
            }
        }
        return state;
    }

    async function ensureEventState(entry: RunEntry): Promise<EventState> {
        if (entry.events !== undefined) {
            return entry.events;
        }
        entry.eventsLoading ??= loadEventState(entry).then((state) => {
            entry.events = state;
            return state;
        });
        return entry.eventsLoading;
    }

    function persistEvents(entry: RunEntry, state: EventState, records: EventRecord[]): void {
        const prefix = state.tailUnterminated ? '\n' : '';
        state.tailUnterminated = false;
        const text = prefix + records.map((record) => encodeLine(record)).join('');
        const name = eventFileName(entry.view.runId);
        void enqueue(name, () => medium.append(name, text)).then((failure) => {
            if (failure === undefined) {
                state.pending = state.pending.filter((record) => !records.includes(record));
            }
        });
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
            assertWritable();
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
            const entry: RunEntry = {
                view: newView(record),
                order: orderCounter++,
                tailUnterminated: false,
                events: emptyEventState(),
                eventsLoading: undefined,
            };
            runs.set(runId, entry);
            const failure = await enqueue(runFileName(runId), () => medium.append(runFileName(runId), encodeLine(record)));
            if (failure !== undefined) {
                runs.delete(runId);
                throw new RuntimeRefusal('storage-failed', `The run could not be stored: ${failure}`);
            }
            return copyView(entry.view);
        },
        async reportStatus(runId, status, report = {}) {
            assertWritable();
            const entry = requireRun(runId);
            if (!isRunStatus(status)) {
                throw new RuntimeRefusal('invalid-status', `Status ${status} is not in the closed list of run statuses.`);
            }
            const record: StatusRecord = { v: FORMAT_VERSION, k: 'status', status, at: iso() };
            if (report.cause !== undefined) {
                record.cause = masker.text(report.cause);
            }
            if (report.model !== undefined) {
                record.model = report.model;
            }
            if (report.sessionRef !== undefined) {
                record.sessionRef = report.sessionRef;
            }
            if (report.errorClass !== undefined) {
                record.errorClass = masker.text(report.errorClass);
            }
            if (report.errorMessage !== undefined) {
                record.errorMessage = masker.text(report.errorMessage);
            }
            if (report.result !== undefined) {
                record.result = masker.json(report.result);
            }
            await commitStatus(entry, record);
            return copyView(entry.view);
        },
        async listRuns(query = {}) {
            const stopped = blocked();
            if (stopped !== undefined) {
                return stopped;
            }
            const selected = [...runs.values()]
                .filter((entry) => query.stem === undefined || entry.view.spec.stem === query.stem)
                .sort((a, b) => b.view.created.localeCompare(a.view.created) || b.order - a.order);
            return { available: true, value: selected.map((entry) => copyView(entry.view)) };
        },
        async getRun(runId) {
            const stopped = blocked();
            if (stopped !== undefined) {
                return stopped;
            }
            const entry = runs.get(runId);
            return { available: true, value: entry === undefined ? undefined : copyView(entry.view) };
        },
        async appendEvent(runId, input) {
            assertWritable();
            const entry = requireRun(runId);
            const state = await ensureEventState(entry);
            if (input.providerEventId !== undefined && state.ids.has(input.providerEventId)) {
                return { outcome: 'duplicate' };
            }
            if (state.truncated) {
                return { outcome: 'dropped' };
            }
            const record: EventRecord = {
                v: FORMAT_VERSION,
                seq: state.nextSeq++,
                runId,
                receivedAt: iso(),
                type: input.type,
                payload: masker.json(input.payload),
            };
            if (input.occurredAt !== undefined) {
                record.occurredAt = input.occurredAt;
            }
            if (input.providerEventId !== undefined) {
                record.providerEventId = input.providerEventId;
                state.ids.add(input.providerEventId);
            }
            state.count += 1;
            const records = [record];
            if (state.count >= eventCap) {
                records.push({
                    v: FORMAT_VERSION,
                    seq: state.nextSeq++,
                    runId,
                    receivedAt: record.receivedAt,
                    type: 'truncated',
                    payload: { limit: eventCap },
                });
                state.truncated = true;
                state.count += 1;
            }
            state.pending.push(...records);
            persistEvents(entry, state, records);
            return { outcome: 'stored', seq: record.seq };
        },
        async readEvents(runId, fromSeq, size) {
            const stopped = blocked();
            if (stopped !== undefined) {
                return stopped;
            }
            const entry = runs.get(runId);
            const limit = Math.min(Math.floor(size), MAX_PAGE_SIZE);
            if (entry === undefined || !(limit >= 1)) {
                return { available: true, value: [] };
            }
            const overlay = [...(entry.events?.pending ?? [])];
            const found = new Map<number, EventRecord>();
            for await (const line of medium.lines(eventFileName(runId))) {
                const parsed = parseEventRecord(line.text);
                if (parsed.kind === 'record' && parsed.record.seq >= fromSeq) {
                    found.set(parsed.record.seq, parsed.record);
                    if (found.size >= limit) {
                        break;
                    }
                }
            }
            for (const record of overlay) {
                if (record.seq >= fromSeq) {
                    found.set(record.seq, record);
                }
            }
            const page = [...found.values()].sort((a, b) => a.seq - b.seq).slice(0, limit);
            return { available: true, value: page.map(toStoredEvent) };
        },
        async appendSpecStatusEntry(stem, entry) {
            assertWritable();
            const record: HistoryRecord = { v: FORMAT_VERSION, stem, observedAt: iso(), entry };
            const failure = await enqueue(HISTORY_FILE, () => medium.append(HISTORY_FILE, encodeLine(record)));
            if (failure !== undefined) {
                throw new RuntimeRefusal('storage-failed', `The spec status entry could not be stored: ${failure}`);
            }
        },
        async readSpecStatusHistory(stem) {
            const stopped = blocked();
            if (stopped !== undefined) {
                return stopped;
            }
            const records: SpecStatusRecord[] = [];
            for await (const line of medium.lines(HISTORY_FILE)) {
                const parsed = parseHistoryRecord(line.text);
                if (parsed.kind === 'record' && (stem === undefined || parsed.record.stem === stem)) {
                    records.push({ stem: parsed.record.stem, observedAt: parsed.record.observedAt, entry: parsed.record.entry });
                }
            }
            return { available: true, value: records };
        },
        clear: async () => {
            assertWritable();
            return notImplemented();
        },
        async dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            timer?.dispose();
            let bound: Disposable | undefined;
            const gaveUp = new Promise<void>((resolve) => {
                bound = clock.setTimeout(resolve, 3000);
            });
            await Promise.race([Promise.all([...queues.values()]), gaveUp]);
            bound?.dispose();
            if (writer) {
                writer = false;
                await lock.release().catch(() => undefined);
            }
            stateListeners.clear();
        },
    };
}
