import type { AgentStartView, StartConfirmation, StartNotice, StartRefusal } from '../../shared/protocol/agentStart';
import { titleOf } from '../board/cards';
import type { AgentStartUiPort, PreviousRunSummary, StartOrchestratorPort } from '../ports/agentStart';
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
        pending = check(request, mine);
    }

    const modelSubscription = preconditions.model.onDidChange(() => {
        const next = preconditions.model.current()?.project.root;
        if (next === root) {
            return;
        }
        root = next;
        reset();
        refusal = undefined;
        notice = undefined;
        emit();
    });

    return {
        async start(request) {
            handOff(request);
        },
        handOff,
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
            modelSubscription.dispose();
            listeners.clear();
        },
    };
}
