import type { OrchestratorUiPort } from '../ports/orchestrator';
import { OPEN_STATUSES } from '../runtime/model';
import type { RuntimeSession } from '../runtime/runtimeSession';
import type { Orchestrator } from './orchestrator';
import { NO_RUN_OPEN, NO_RUN_RESUMABLE, RESUME_PICK_PLACEHOLDER, STOP_BUTTON, stopConfirmText } from './texts';

export interface RunCommandsDeps {
    orchestrator: Pick<Orchestrator, 'stop' | 'resume' | 'resumability'>;
    session: Pick<RuntimeSession, 'current'>;
    ui: OrchestratorUiPort;
}

export interface RunCommands {
    stopRun(): Promise<void>;
    resumeRun(): Promise<void>;
}

export function createRunCommands(deps: RunCommandsDeps): RunCommands {
    const { orchestrator, session, ui } = deps;

    async function stopRun(): Promise<void> {
        const store = session.current();
        const listed = store === undefined ? undefined : await store.listRuns();
        const open = listed?.available === true ? listed.value.find((run) => (OPEN_STATUSES as readonly string[]).includes(run.status)) : undefined;
        if (open === undefined) {
            ui.info(NO_RUN_OPEN);
            return;
        }
        if (!(await ui.confirm(stopConfirmText(open.spec.stem), STOP_BUTTON))) {
            return;
        }
        const result = await orchestrator.stop(open.runId);
        if (result.kind === 'refused') {
            ui.info(result.reason);
        }
    }

    async function resumeRun(): Promise<void> {
        const store = session.current();
        const listed = store === undefined ? undefined : await store.listRuns();
        const candidates: { runId: string; stem: string }[] = [];
        for (const run of listed?.available === true ? listed.value : []) {
            if (run.status === 'Interrupted' && (await orchestrator.resumability(run.runId)).resumable) {
                candidates.push({ runId: run.runId, stem: run.spec.stem });
            }
        }
        if (candidates.length === 0) {
            ui.info(NO_RUN_RESUMABLE);
            return;
        }
        const chosen =
            candidates.length === 1
                ? candidates[0]?.runId
                : await ui.pick(
                      candidates.map((candidate) => ({ id: candidate.runId, label: candidate.stem, description: candidate.runId })),
                      RESUME_PICK_PLACEHOLDER,
                  );
        if (chosen === undefined) {
            return;
        }
        const result = await orchestrator.resume(chosen);
        if (result.kind === 'refused') {
            ui.info(result.reason);
        }
    }

    return { stopRun, resumeRun };
}
