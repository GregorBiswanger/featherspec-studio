import type { ShellModel, ShellModelSource } from '../ports/shell';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { SpecRepository } from '../specs/specRepository';

export function createModelSource(repository: Pick<SpecRepository, 'snapshot' | 'readAt' | 'onDidChange'>): ShellModelSource {
    let cached: ShellModel | undefined;
    return {
        current() {
            const project = repository.snapshot();
            if (project === undefined) {
                cached = undefined;
                return undefined;
            }
            if (cached?.project !== project) {
                cached = { project, lifecycle: deriveLifecycle(project) };
            }
            return cached;
        },
        updatedAt: () => repository.readAt() ?? '',
        onDidChange(listener) {
            return repository.onDidChange(() => listener());
        },
    };
}
