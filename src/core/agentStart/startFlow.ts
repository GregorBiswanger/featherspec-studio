import type { AgentStartView, StartConfirmation, StartNotice, StartRefusal } from '../../shared/protocol/agentStart';
import { titleOf } from '../board/cards';
import type { AgentStartRequest, AgentStartUiPort, PreviousRunSummary, StartAnswer, StartOrchestratorPort } from '../ports/agentStart';
import type { RunSource } from '../missionControl/runSource';
import type { StartRequest, StartWorkflowPort } from '../ports/board';
import type { Disposable } from '../ports/host';
import { checkPreconditions, type PreconditionDeps } from './preconditions';
import { refusalItems } from './refusalItems';
import { buildStartPrompt } from './startPrompt';

export interface StartFlowDeps {
    preconditions: PreconditionDeps;
    orchestrator: StartOrchestratorPort;
    ui: AgentStartUiPort;
    runs: RunSource;
}

export interface StartFlow extends StartWorkflowPort {
    handOff(request: StartRequest): void;
    confirm(token: string): void;
    cancel(token: string): void;
    panelHidden(): void;
    dismiss(which: 'refusal' | 'notice'): void;
    view(): AgentStartView;
    onDidChangeView(listener: () => void): Disposable;
    whenIdle(): Promise<void>;
    dispose(): void;
}

type Phase = 'idle' | 'checking' | 'confirming' | 'starting';

const PREVIOUS_RUN_UNREADABLE = 'The previous run could not be read.';

export function createStartFlow(deps: StartFlowDeps): StartFlow {
    const { preconditions } = deps;
    const listeners = new Set<() => void>();
    let phase: Phase = 'idle';
    let generation = 0;
    let tokens = 0;
    let checking: { number: string } | undefined;
    let confirmation: StartConfirmation | undefined;
    let refusal: StartRefusal | undefined;
    let notice: StartNotice | undefined;
    let pending: Promise<void> = Promise.resolve();
    let disposed = false;
    let watch: Disposable | undefined;
    let root = preconditions.model.current()?.project.root;

    function emit(): void {
        if (disposed) {
            return;
        }
        for (const listener of [...listeners]) {
            try {
                listener();
            } catch {
                continue;
            }
        }
    }

    function numberOf(stem: string): string {
        const entry = preconditions.model.current()?.lifecycle.entries.find((candidate) => candidate.stem === stem);
        return entry?.number ?? stem.slice(0, 4);
    }

    function tracked(work: Promise<void>): void {
        const earlier = pending;
        pending = Promise.all([earlier, work]).then(() => undefined);
    }

    function stopWatching(): void {
        watch?.dispose();
        watch = undefined;
    }

    function watchRun(runId: string): void {
        stopWatching();
        let current = true;
        let subscription: Disposable | undefined;
        const handle: Disposable = {
            dispose() {
                current = false;
                subscription?.dispose();
            },
        };
        const evaluate = async (): Promise<void> => {
            const read = await deps.runs.read();
            if (!current || !read.available) {
                return;
            }
            const run = read.runs.find((candidate) => candidate.runId === runId);
            if (run === undefined || run.status === 'Starting') {
                return;
            }
            handle.dispose();
            if (watch === handle) {
                watch = undefined;
            }
            const failed = run.statusHistory.findIndex((entry) => entry.status === 'Failed');
            if (run.status === 'Failed' && failed > 0 && run.statusHistory[failed - 1]?.status === 'Starting') {
                notice = { runId, errorClass: run.errorClass ?? 'not available' };
                emit();
            }
        };
        subscription = deps.runs.onDidChange(() => tracked(evaluate()));
        watch = handle;
        tracked(evaluate());
    }

    function reset(): void {
        generation += 1;
        if (phase !== 'starting') {
            phase = 'idle';
        }
        checking = undefined;
        confirmation = undefined;
    }

    async function previousOf(stem: string): Promise<PreviousRunSummary> {
        try {
            return await deps.orchestrator.previousRun(stem);
        } catch {
            return { kind: 'not-available', reason: PREVIOUS_RUN_UNREADABLE };
        }
    }

    async function check(request: StartRequest, mine: number): Promise<void> {
        const result = await checkPreconditions(preconditions, request.stem);
        if (mine !== generation) {
            return;
        }
        if (result.failures.length > 0 || result.entry === undefined || result.provider === undefined) {
            checking = undefined;
            phase = 'idle';
            refusal = { number: numberOf(request.stem), items: refusalItems(result.failures, result.provider?.entry.displayName, request.stem) };
            emit();
            return;
        }
        const { entry, provider } = result;
        const previousRun = await previousOf(request.stem);
        if (mine !== generation) {
            return;
        }
        const model = preconditions.model.current();
        const spec = model?.project.specs.find((candidate) => candidate.key === entry.key);
        const planPath = entry.plan ?? entry.key.replace(/\.md$/, '.plan.md');
        tokens += 1;
        checking = undefined;
        phase = 'confirming';
        confirmation = {
            token: `c-${tokens}`,
            spec: { number: entry.number, title: (spec === undefined ? undefined : titleOf(spec)) ?? entry.stem, stem: entry.stem },
            provider: { id: provider.entry.id, displayName: provider.entry.displayName },
            ...(provider.model === undefined ? {} : { model: provider.model }),
            permissionMode: provider.entry.permissionModeLabel,
            ...(provider.entry.disclosure === undefined ? {} : { disclosure: provider.entry.disclosure }),
            missing: (['approvals', 'userInput'] as const).filter((capability) => provider.entry.capabilities[capability].value === 'none'),
            previousRun,
            prompt: buildStartPrompt({ stem: entry.stem, specPath: entry.key, planPath }),
            starting: false,
        };
        emit();
    }

    function handOff(request: StartRequest): void {
        if (disposed) {
            return;
        }
        deps.ui.reveal();
        if (phase !== 'idle') {
            refusal = { items: [{ id: 'pending' }] };
            emit();
            return;
        }
        phase = 'checking';
        generation += 1;
        const mine = generation;
        refusal = undefined;
        checking = { number: numberOf(request.stem) };
        emit();
        tracked(check(request, mine));
    }

    async function doStart(mine: number, shown: StartConfirmation): Promise<void> {
        const number = shown.spec.number;
        const refuseWith = (items: StartRefusal['items']): void => {
            phase = 'idle';
            confirmation = undefined;
            refusal = { number, items };
            emit();
        };
        const result = await checkPreconditions(preconditions, shown.spec.stem);
        if (mine !== generation) {
            phase = 'idle';
            return;
        }
        if (result.failures.length > 0 || result.entry === undefined || result.provider === undefined) {
            refuseWith(refusalItems(result.failures, result.provider?.entry.displayName, shown.spec.stem));
            return;
        }
        const { entry, provider } = result;
        if (provider.entry.id !== shown.provider.id || provider.model !== shown.model || provider.entry.permissionModeLabel !== shown.permissionMode) {
            refuseWith([{ id: 'outdated' }]);
            return;
        }
        const request: AgentStartRequest = {
            providerId: provider.entry.id,
            ...(provider.model === undefined ? {} : { model: provider.model }),
            spec: { stem: entry.stem, path: entry.key },
            prompt: shown.prompt,
            projectRoot: preconditions.model.current()?.project.root ?? '',
        };
        let answer: StartAnswer;
        try {
            answer = await deps.orchestrator.start(request);
        } catch (error) {
            answer = { kind: 'refused', text: error instanceof Error ? error.message : String(error) };
        }
        phase = 'idle';
        if (mine !== generation) {
            return;
        }
        if (answer.kind === 'refused') {
            refuseWith([{ id: 'orchestrator', text: answer.text, ...(answer.run === undefined ? {} : { run: { runId: answer.run.runId, stem: answer.run.stem } }) }]);
            return;
        }
        confirmation = undefined;
        emit();
        watchRun(answer.runId);
    }

    const modelSubscription = preconditions.model.onDidChange(() => {
        const next = preconditions.model.current()?.project.root;
        if (next === root) {
            return;
        }
        root = next;
        reset();
        stopWatching();
        refusal = undefined;
        notice = undefined;
        emit();
    });

    return {
        async start(request) {
            handOff(request);
        },
        handOff,
        confirm(token) {
            if (disposed || phase !== 'confirming' || confirmation?.token !== token) {
                return;
            }
            phase = 'starting';
            notice = undefined;
            confirmation = { ...confirmation, starting: true };
            emit();
            tracked(doStart(generation, confirmation));
        },
        cancel(token) {
            if (phase !== 'confirming' || confirmation?.token !== token) {
                return;
            }
            reset();
            emit();
        },
        panelHidden() {
            if (phase === 'checking' || phase === 'confirming') {
                reset();
                emit();
            }
        },
        dismiss(which) {
            if (which === 'refusal' && refusal !== undefined) {
                refusal = undefined;
                emit();
            } else if (which === 'notice' && notice !== undefined) {
                notice = undefined;
                emit();
            }
        },
        view() {
            return {
                ...(checking === undefined ? {} : { checking: { ...checking } }),
                ...(confirmation === undefined ? {} : { confirmation: { ...confirmation } }),
                ...(refusal === undefined ? {} : { refusal: { ...refusal } }),
                ...(notice === undefined ? {} : { notice: { ...notice } }),
            };
        },
        onDidChangeView(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        async whenIdle() {
            let current: Promise<void>;
            do {
                current = pending;
                await current;
            } while (current !== pending);
        },
        dispose() {
            disposed = true;
            stopWatching();
            modelSubscription.dispose();
            listeners.clear();
        },
    };
}
