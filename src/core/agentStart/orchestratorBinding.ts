import type { Orchestrator } from '../orchestrator/orchestrator';
import type { StartOrchestratorPort } from '../ports/agentStart';
import { NOT_AVAILABLE } from '../runtime/model';

export function bindOrchestrator(orchestrator: Pick<Orchestrator, 'start' | 'previousRun'>, rootToPath: (root: string) => string): StartOrchestratorPort {
    return {
        async start(request) {
            const result = await orchestrator.start({
                stem: request.spec.stem,
                path: request.spec.path,
                providerId: request.providerId,
                model: request.model ?? NOT_AVAILABLE,
                prompt: request.prompt,
                workingDirectory: rootToPath(request.projectRoot),
            });
            if (result.kind === 'started') {
                return { kind: 'started', runId: result.runId };
            }
            return { kind: 'refused', text: result.reason, ...(result.run === undefined ? {} : { run: { runId: result.run.runId, stem: result.run.stem } }) };
        },
        async previousRun(stem) {
            const previous = await orchestrator.previousRun(stem);
            if (previous.kind === 'run') {
                return { kind: 'run', runId: previous.runId, status: previous.status, errorClass: previous.errorClass, errorText: previous.errorText };
            }
            return previous;
        },
    };
}
