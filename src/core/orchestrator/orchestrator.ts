import type { ApprovalAnswer, ProviderEvent } from '../ports/agentProvider';
import type { Disposable } from '../ports/host';
import type { OrchestratorUiPort } from '../ports/orchestrator';
import type { RuntimeClock } from '../ports/runtimeMedium';
import type { ShellModelSource } from '../ports/shell';
import type { ProviderRegistry } from '../providers/registry';
import type { ProviderService, ServiceRefusal, ServiceResult } from '../providers/providerService';
import { NOT_AVAILABLE, OPEN_STATUSES, isEndStatus, type JsonValue, type RunStatus, type StatusReport } from '../runtime/model';
import { READER_REASON } from '../runtime/notices';
import type { RuntimeStore } from '../runtime/runtimeStore';
import type { RuntimeSession } from '../runtime/runtimeSession';
import { storedResult } from './result';
import { applyEvent, createTrack, transition, type RunTrack, type TrackStep } from './runTrack';
import {
    INVALID_APPROVAL_TEXT,
    INVALID_INPUT_TEXT,
    READER_TEXT,
    START_TIMEOUT_MS,
    STOP_NOT_CONFIRMED_CAUSE,
    STOP_TIMEOUT_MS,
    noStopText,
    stopPendingText,
    START_TIMEOUT_TEXT,
    alreadyEndedText,
    createFailedText,
    notRegisteredText,
    requestNotOpenText,
    runOpenText,
    storeText,
} from './texts';

export type RefusalCode =
    | 'reader-window'
    | 'store-not-writable'
    | 'run-open'
    | 'not-registered'
    | 'create-failed'
    | 'not-open'
    | 'not-supported'
    | 'stop-pending'
    | 'request-not-open'
    | 'invalid-answer'
    | 'not-resumable'
    | 'provider-refused';

export interface Refusal {
    kind: 'refused';
    code: RefusalCode;
    reason: string;
    run?: { runId: string; stem: string };
}

export interface StartRequest {
    stem: string;
    path: string;
    providerId: string;
    model: string;
    prompt: string;
    workingDirectory: string;
}

export type StartResult = { kind: 'started'; runId: string } | Refusal;
export type StopResult = { kind: 'stopping' } | Refusal;
export type AnswerResult = { kind: 'ok' } | Refusal;
export type Resumability = { resumable: true } | { resumable: false; reason: string };
export type ResumeResult = { kind: 'resumed'; runId: string } | { kind: 'declined' } | Refusal;
export type PreviousRun =
    | { kind: 'run'; runId: string; status: RunStatus; errorClass: string; errorText: string }
    | { kind: 'none' }
    | { kind: 'not-available'; reason: string };

export interface Orchestrator {
    start(request: StartRequest): Promise<StartResult>;
    stop(runId: string): Promise<StopResult>;
    resumability(runId: string): Promise<Resumability>;
    resume(runId: string): Promise<ResumeResult>;
    respondToApproval(runId: string, requestId: string, answer: ApprovalAnswer): Promise<AnswerResult>;
    respondToInput(runId: string, requestId: string, text: string): Promise<AnswerResult>;
    previousRun(stem: string): Promise<PreviousRun>;
    whenIdle(): Promise<void>;
    dispose(): void;
}

export interface OrchestratorDeps {
    session: Pick<RuntimeSession, 'current' | 'state' | 'onDidChangeState'>;
    registry: ProviderRegistry;
    providers: ProviderService;
    specs: ShellModelSource;
    ui: OrchestratorUiPort;
    clock: RuntimeClock;
    workingDirectory: () => string | undefined;
}

interface Tracked {
    runId: string;
    stem: string;
    providerId: string;
    store: RuntimeStore;
    track: RunTrack;
    startTimer: Disposable | undefined;
    stopTimer: Disposable | undefined;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function refusalReason(refusal: ServiceRefusal): string {
    switch (refusal.kind) {
        case 'not-registered':
            return notRegisteredText(refusal.providerId);
        case 'failed':
        case 'invalid-answer':
            return refusal.reason;
        case 'not-supported':
            return `Provider ${refusal.providerId} does not support this operation.`;
        case 'unknown-run':
        case 'already-ended':
            return alreadyEndedText(refusal.runId);
        case 'request-not-open':
            return requestNotOpenText(refusal.runId, refusal.requestId);
    }
}

export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
    const runs = new Map<string, Tracked>();
    let queue: Promise<void> = Promise.resolve();
    let lock: Promise<void> = Promise.resolve();

    const enqueue = (task: () => Promise<void>): void => {
        queue = queue.then(task).then(
            () => undefined,
            () => undefined,
        );
    };

    const locked = <T>(task: () => Promise<T>): Promise<T> => {
        const result = lock.then(task);
        lock = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    };

    const writerRefusal = (): Refusal | undefined => {
        const state = deps.session.state();
        if (state.kind === 'writable' && deps.session.current() !== undefined) {
            return undefined;
        }
        if (state.kind === 'read-only' && state.reason === READER_REASON) {
            return { kind: 'refused', code: 'reader-window', reason: READER_TEXT };
        }
        return { kind: 'refused', code: 'store-not-writable', reason: storeText(state.reason ?? 'unknown') };
    };

    const commit = async (run: Tracked, step: TrackStep): Promise<void> => {
        const report: StatusReport = {};
        if (step.cause !== undefined) {
            report.cause = step.cause;
        }
        if (step.sessionRef !== undefined) {
            report.sessionRef = step.sessionRef;
        }
        if (step.model !== undefined) {
            report.model = step.model;
        }
        if (step.failure !== undefined) {
            report.errorClass = step.failure.errorClass;
            report.errorMessage = step.failure.errorMessage;
        }
        if (isEndStatus(step.status)) {
            report.result = { ...storedResult(run.track) };
        }
        try {
            await run.store.reportStatus(run.runId, step.status, report);
        } catch {
            return;
        }
    };

    const leftStarting = (run: Tracked): void => {
        if (run.track.status !== 'Starting') {
            run.startTimer?.dispose();
            run.startTimer = undefined;
        }
        if (isEndStatus(run.track.status)) {
            run.stopTimer?.dispose();
            run.stopTimer = undefined;
        }
    };

    const declaresCancel = (providerId: string): boolean => {
        const found = deps.registry.entry(providerId);
        return found.kind === 'ok' && found.entry.capabilities.cancel.value !== 'none';
    };

    const letGo = (run: Tracked): void => {
        if (runs.get(run.runId) !== run) {
            return;
        }
        runs.delete(run.runId);
        run.startTimer?.dispose();
        run.startTimer = undefined;
        run.stopTimer?.dispose();
        run.stopTimer = undefined;
        if (isEndStatus(run.track.status)) {
            return;
        }
        if (declaresCancel(run.providerId)) {
            deps.providers.cancel(run.runId).catch(() => undefined);
        }
        deps.providers.endSession(run.runId);
    };

    const storeLost = (run: Tracked): boolean => deps.session.state().kind !== 'writable' || deps.session.current() !== run.store;

    const checkStores = (): void => {
        for (const run of [...runs.values()]) {
            if (storeLost(run)) {
                letGo(run);
            }
        }
    };

    const failRun = async (run: Tracked, errorClass: string, errorMessage: string): Promise<void> => {
        const ended = transition(run.track, 'Failed');
        if (ended === undefined) {
            return;
        }
        run.track = ended;
        leftStarting(run);
        await commit(run, { status: 'Failed', failure: { errorClass, errorMessage } });
    };

    const endStart = async (run: Tracked): Promise<void> => {
        if (runs.get(run.runId) !== run || run.track.status !== 'Starting') {
            return;
        }
        await failRun(run, 'start_timeout', START_TIMEOUT_TEXT);
        if (declaresCancel(run.providerId)) {
            deps.providers.cancel(run.runId).catch(() => undefined);
        }
        deps.providers.endSession(run.runId);
    };

    const endStop = async (run: Tracked): Promise<void> => {
        if (runs.get(run.runId) !== run) {
            return;
        }
        const ended = transition(run.track, 'Cancelled');
        if (ended === undefined) {
            return;
        }
        run.track = ended;
        leftStarting(run);
        await commit(run, { status: 'Cancelled', cause: STOP_NOT_CONFIRMED_CAUSE });
        deps.providers.endSession(run.runId);
    };

    const openRun = (runId: string): Tracked | undefined => {
        checkStores();
        const run = runs.get(runId);
        return run === undefined || isEndStatus(run.track.status) ? undefined : run;
    };

    const stop = async (runId: string): Promise<StopResult> => {
        const blocked = writerRefusal();
        if (blocked !== undefined) {
            return blocked;
        }
        await queue;
        const run = openRun(runId);
        if (run === undefined) {
            return { kind: 'refused', code: 'not-open', reason: alreadyEndedText(runId) };
        }
        const entry = deps.registry.entry(run.providerId);
        if (entry.kind !== 'ok' || entry.entry.capabilities.cancel.value === 'none') {
            return { kind: 'refused', code: 'not-supported', reason: noStopText(entry.kind === 'ok' ? entry.entry.displayName : run.providerId) };
        }
        if (run.stopTimer !== undefined) {
            return { kind: 'refused', code: 'stop-pending', reason: stopPendingText(runId) };
        }
        run.stopTimer = deps.clock.setTimeout(() => enqueue(() => endStop(run)), STOP_TIMEOUT_MS);
        deps.providers.cancel(runId).catch(() => undefined);
        return { kind: 'stopping' };
    };

    const answer = async (
        runId: string,
        requestId: string,
        type: 'approval' | 'input',
        valid: boolean,
        forward: () => Promise<ServiceResult>,
    ): Promise<AnswerResult> => {
        const blocked = writerRefusal();
        if (blocked !== undefined) {
            return blocked;
        }
        await queue;
        const run = openRun(runId);
        const open = run !== undefined && (type === 'approval' ? run.track.approvals : run.track.inputs).includes(requestId);
        if (!open) {
            return { kind: 'refused', code: 'request-not-open', reason: requestNotOpenText(runId, requestId) };
        }
        if (!valid) {
            return { kind: 'refused', code: 'invalid-answer', reason: type === 'approval' ? INVALID_APPROVAL_TEXT : INVALID_INPUT_TEXT };
        }
        const result = await forward();
        if (result.kind === 'ok') {
            return { kind: 'ok' };
        }
        const code = result.kind === 'request-not-open' ? 'request-not-open' : result.kind === 'invalid-answer' ? 'invalid-answer' : 'provider-refused';
        return { kind: 'refused', code, reason: refusalReason(result) };
    };

    const handleEvent = async (event: ProviderEvent): Promise<void> => {
        const run = runs.get(event.runId);
        if (run === undefined) {
            return;
        }
        if (storeLost(run)) {
            letGo(run);
            return;
        }
        const payload: JsonValue = isObject(event.payload) ? { ...event.payload, source: event.source } : { value: event.payload, source: event.source };
        let outcome;
        try {
            outcome = await run.store.appendEvent(run.runId, {
                type: event.kind,
                payload,
                ...(event.occurredAt === undefined ? {} : { occurredAt: event.occurredAt }),
                ...(event.providerEventId === undefined ? {} : { providerEventId: event.providerEventId }),
            });
        } catch {
            return;
        }
        if (outcome.outcome === 'duplicate') {
            return;
        }
        const applied = applyEvent(run.track, { kind: event.kind, source: event.source, payload: event.payload });
        run.track = applied.track;
        leftStarting(run);
        for (const step of applied.steps) {
            await commit(run, step);
        }
    };

    const subscription: Disposable = deps.providers.onEvent((event) => enqueue(() => handleEvent(event)));
    const stateSubscription: Disposable = deps.session.onDidChangeState(() => checkStores());

    const start = async (request: StartRequest): Promise<StartResult> => {
        const blocked = writerRefusal();
        if (blocked !== undefined) {
            return blocked;
        }
        if (deps.registry.entry(request.providerId).kind !== 'ok') {
            return { kind: 'refused', code: 'not-registered', reason: notRegisteredText(request.providerId) };
        }
        const store = deps.session.current();
        if (store === undefined) {
            return { kind: 'refused', code: 'store-not-writable', reason: storeText('unknown') };
        }
        const model = request.model === NOT_AVAILABLE ? undefined : request.model;
        const created = await locked(async (): Promise<Refusal | { kind: 'created'; runId: string }> => {
            const listed = await store.listRuns();
            if (!listed.available) {
                return { kind: 'refused', code: 'store-not-writable', reason: storeText(listed.reason) };
            }
            const open = listed.value.find((run) => (OPEN_STATUSES as readonly string[]).includes(run.status));
            if (open !== undefined) {
                return {
                    kind: 'refused',
                    code: 'run-open',
                    reason: runOpenText(open.runId, open.spec.stem),
                    run: { runId: open.runId, stem: open.spec.stem },
                };
            }
            try {
                const run = await store.createRun({
                    providerId: request.providerId,
                    spec: { stem: request.stem, path: request.path },
                    ...(model === undefined ? {} : { model }),
                });
                const tracked: Tracked = { runId: run.runId, stem: request.stem, providerId: request.providerId, store, track: createTrack(), startTimer: undefined, stopTimer: undefined };
                tracked.startTimer = deps.clock.setTimeout(() => enqueue(() => endStart(tracked)), START_TIMEOUT_MS);
                runs.set(run.runId, tracked);
                return { kind: 'created', runId: run.runId };
            } catch (error) {
                return { kind: 'refused', code: 'create-failed', reason: createFailedText(messageOf(error)) };
            }
        });
        if (created.kind === 'refused') {
            return created;
        }
        const run = runs.get(created.runId);
        const result = await deps.providers.start(request.providerId, {
            runId: created.runId,
            workingDirectory: request.workingDirectory,
            prompt: request.prompt,
            ...(model === undefined ? {} : { model }),
        });
        if (result.kind !== 'ok' && run !== undefined) {
            enqueue(() => failRun(run, 'unknown', refusalReason(result)));
        }
        return { kind: 'started', runId: created.runId };
    };

    return {
        start,
        stop,
        resumability: () => Promise.reject(new Error('Not implemented')),
        resume: () => Promise.reject(new Error('Not implemented')),
        respondToApproval: (runId, requestId, approval) => {
            const decision = (approval as { decision?: unknown } | undefined)?.decision;
            const reason = (approval as { reason?: unknown } | undefined)?.reason;
            const valid = decision === 'approve-once' || (decision === 'reject' && (reason === undefined || typeof reason === 'string'));
            const exact: ApprovalAnswer = decision === 'reject' ? (typeof reason === 'string' ? { decision: 'reject', reason } : { decision: 'reject' }) : { decision: 'approve-once' };
            return answer(runId, requestId, 'approval', valid, () => deps.providers.respondToApproval(runId, requestId, exact));
        },
        respondToInput: (runId, requestId, text) =>
            answer(runId, requestId, 'input', typeof text === 'string', () => deps.providers.respondToInput(runId, requestId, text)),
        async previousRun(stem) {
            const store = deps.session.current();
            if (store === undefined) {
                return { kind: 'not-available', reason: deps.session.state().reason ?? 'unknown' };
            }
            const listed = await store.listRuns({ stem });
            if (!listed.available) {
                return { kind: 'not-available', reason: listed.reason };
            }
            const latest = listed.value[0];
            if (latest === undefined) {
                return { kind: 'none' };
            }
            return {
                kind: 'run',
                runId: latest.runId,
                status: latest.status,
                errorClass: latest.errorClass ?? NOT_AVAILABLE,
                errorText: latest.errorMessage ?? NOT_AVAILABLE,
            };
        },
        async whenIdle() {
            for (;;) {
                const seenQueue = queue;
                const seenLock = lock;
                await seenQueue;
                await seenLock;
                if (seenQueue === queue && seenLock === lock) {
                    return;
                }
            }
        },
        dispose() {
            subscription.dispose();
            stateSubscription.dispose();
            for (const run of [...runs.values()]) {
                letGo(run);
            }
        },
    };
}
