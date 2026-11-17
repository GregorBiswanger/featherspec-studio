import type { Disposable } from '../ports/host';
import type { IdSource, RuntimeClock, RuntimeMedium, RuntimeNoticePort } from '../ports/runtimeMedium';
import {
    NEWER_VERSION_REASON,
    READER_REASON,
    STORE_CLOSED_REASON,
    newerVersionNotice,
    storageUnreachableNotice,
} from './notices';
import { createWriterLock } from './writerLock';
import { encodeLine, parseHistoryRecord, type HistoryRecord } from './records';
import {
    FORMAT_VERSION,
    HEARTBEAT_INTERVAL_MS,
    MAX_AGE_DAYS,
    RuntimeRefusal,
    type JsonValue,
    type ReadResult,
    type SpecStatusRecord,
    type StoreState,
} from './model';

export interface RuntimeStoreDeps {
    medium: RuntimeMedium;
    ids: IdSource;
    clock: RuntimeClock;
    notices: RuntimeNoticePort;
    projectRoot: string;
}

export interface RuntimeStore {
    state(): StoreState;
    onDidChangeState(listener: (state: StoreState) => void): Disposable;
    appendSpecStatusEntry(stem: string, entry: JsonValue): Promise<void>;
    readSpecStatusHistory(stem?: string): Promise<ReadResult<SpecStatusRecord[]>>;
    dispose(): Promise<void>;
}

const STORE_FILE = 'store.json';
const HISTORY_FILE = 'spec-status-history.jsonl';
const DAY_MS = 86_400_000;

function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

interface HistoryShape {
    newer: boolean;
    tailUnterminated: boolean;
}

export async function openRuntimeStore(deps: RuntimeStoreDeps): Promise<RuntimeStore> {
    const { medium, clock } = deps;
    const queues = new Map<string, Promise<void>>();
    const stateListeners = new Set<(state: StoreState) => void>();
    let currentState: StoreState = { kind: 'writable', reason: undefined };
    let readBlock: string | undefined;
    let writer = false;
    let disposed = false;
    let timer: Disposable | undefined;
    let historyShape: HistoryShape | undefined;
    let busy = 0;
    const quietWaiters: (() => void)[] = [];
    const ownerId = deps.ids.newId();
    const lock = createWriterLock(medium, clock, ownerId);

    const iso = (): string => new Date(clock.epochMs()).toISOString();

    function track<T>(work: Promise<T>): Promise<T> {
        busy += 1;
        const done = (): void => {
            busy -= 1;
            if (busy === 0) {
                quietWaiters.splice(0).forEach((resolve) => resolve());
            }
        };
        void work.then(done, done);
        return work;
    }

    function quiet(): Promise<void> {
        return busy === 0 ? Promise.resolve() : new Promise<void>((resolve) => quietWaiters.push(resolve));
    }

    function enqueue(name: string, action: () => Promise<void>): Promise<string | undefined> {
        const previous = queues.get(name) ?? Promise.resolve();
        const outcome = track(
            previous.then(action).then(
                () => undefined,
                (error: unknown) => describeError(error),
            ),
        );
        queues.set(name, outcome.then(() => undefined));
        return outcome;
    }

    function setState(next: StoreState): void {
        if (next.kind === currentState.kind && next.reason === currentState.reason) {
            return;
        }
        currentState = next;
        [...stateListeners].forEach((listener) => listener(next));
    }

    function assertWritable(): void {
        if (disposed) {
            throw new RuntimeRefusal('read-only', STORE_CLOSED_REASON);
        }
        if (currentState.kind === 'writable') {
            return;
        }
        throw new RuntimeRefusal(currentState.kind === 'unavailable' ? 'unavailable' : 'read-only', currentState.reason ?? '');
    }

    function blocked(): { available: false; reason: string } | undefined {
        return readBlock === undefined ? undefined : { available: false, reason: readBlock };
    }

    async function inspectHistory(): Promise<HistoryShape> {
        const shape: HistoryShape = { newer: false, tailUnterminated: false };
        for await (const line of medium.lines(HISTORY_FILE)) {
            shape.tailUnterminated = !line.terminated;
            shape.newer ||= parseHistoryRecord(line.text).kind === 'newer';
        }
        return shape;
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
            historyShape = undefined;
            await enqueue(HISTORY_FILE, () => medium.replace(HISTORY_FILE, text));
        }
    }

    async function applyAgeCap(): Promise<void> {
        const cutoffIso = new Date(clock.epochMs() - MAX_AGE_DAYS * DAY_MS).toISOString();
        await rewriteHistory((record) => record.observedAt >= cutoffIso);
    }

    async function ensureStoreDescriptor(): Promise<void> {
        if ((await medium.read(STORE_FILE)) === undefined) {
            const content = JSON.stringify({ storeVersion: FORMAT_VERSION, projectRoot: deps.projectRoot });
            await enqueue(STORE_FILE, () => medium.replace(STORE_FILE, content));
        }
    }

    async function readDescriptor(): Promise<number | undefined | 'broken'> {
        const text = await medium.read(STORE_FILE);
        if (text === undefined) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(text) as { storeVersion?: unknown };
            return typeof parsed.storeVersion === 'number' ? parsed.storeVersion : 'broken';
        } catch {
            return 'broken';
        }
    }

    async function becomeWriter(): Promise<void> {
        writer = true;
        await ensureStoreDescriptor();
        await applyAgeCap();
        setState({ kind: 'writable', reason: undefined });
    }

    function startTimer(): void {
        timer?.dispose();
        timer = clock.setTimeout(() => void tick(), HEARTBEAT_INTERVAL_MS);
    }

    async function pollOrBeat(): Promise<void> {
        if (writer) {
            if (!(await lock.heartbeat())) {
                writer = false;
                setState({ kind: 'read-only', reason: READER_REASON });
            }
        } else if (readBlock === undefined) {
            const peek = await lock.peek();
            if ((peek.kind === 'free' || peek.kind === 'stale') && (await lock.tryAcquire())) {
                await becomeWriter();
            }
        }
    }

    async function tick(): Promise<void> {
        if (disposed) {
            return;
        }
        await track(pollOrBeat().catch(() => undefined));
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
        const descriptor = await readDescriptor();
        if (descriptor === 'broken') {
            readBlock = 'the description of the status history store cannot be read';
            setState({ kind: 'unavailable', reason: readBlock });
            deps.notices.show(storageUnreachableNotice(readBlock));
        } else if (descriptor !== undefined && descriptor > FORMAT_VERSION) {
            readBlock = NEWER_VERSION_REASON;
            setState({ kind: 'read-only', reason: NEWER_VERSION_REASON });
            deps.notices.show(newerVersionNotice());
        }
    }
    if (readBlock === undefined) {
        if (await lock.tryAcquire()) {
            await becomeWriter();
        } else {
            setState({ kind: 'read-only', reason: READER_REASON });
        }
        startTimer();
    }

    return {
        state: () => currentState,
        onDidChangeState(listener) {
            stateListeners.add(listener);
            return { dispose: () => void stateListeners.delete(listener) };
        },
        async appendSpecStatusEntry(stem, entry) {
            assertWritable();
            const record: HistoryRecord = { v: FORMAT_VERSION, stem, observedAt: iso(), entry };
            let refusal: RuntimeRefusal | undefined;
            const failure = await enqueue(HISTORY_FILE, async () => {
                const shape = (historyShape ??= await inspectHistory());
                if (shape.newer) {
                    refusal = new RuntimeRefusal('newer-version', `The spec status history was written by a newer version of FeatherSpec Studio (${NEWER_VERSION_REASON}); nothing is written to it.`);
                    return;
                }
                await medium.append(HISTORY_FILE, (shape.tailUnterminated ? '\n' : '') + encodeLine(record));
                historyShape = { newer: false, tailUnterminated: false };
            });
            if (refusal !== undefined) {
                throw refusal;
            }
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
            await Promise.race([quiet(), gaveUp]);
            bound?.dispose();
            if (writer) {
                writer = false;
                await lock.release().catch(() => undefined);
            }
            currentState = { kind: 'read-only', reason: STORE_CLOSED_REASON };
            stateListeners.clear();
        },
    };
}
