import type { ClockPort } from '../../ports/host';
import type { JsonValue, SpecStatusRecord } from '../../runtime/model';
import { readProject } from '../../specs/readProject';
import type { ProjectRead } from '../../specs/readProject';
import { createMemorySpecSource } from '../../specs/testing/memorySpecSource';
import { deriveLifecycle } from '../deriveLifecycle';
import type { LifecycleState } from '../model';
import { createStatusHistory } from '../statusHistory';
import { createFakeHistoryStore } from './fakeHistoryStore';
import { ROOT, VERSION } from './projects';

export function record(stem: string, state: LifecycleState | null): SpecStatusRecord {
    return {
        stem,
        observedAt: 'stored-at',
        entry: { observedAt: 'earlier', stem, old: null, new: state, rule: state === null ? null : 'S-BACKLOG', cause: { kind: 'first-observed' }, flow: 'not checked' },
    };
}

export function createHistoryWorld(initial: SpecStatusRecord[] = []) {
    const source = createMemorySpecSource();
    const store = createFakeHistoryStore(initial);
    let tick = 0;
    const clock: ClockPort = { now: () => `2026-11-16T09:00:${String(++tick).padStart(2, '0')}Z`, setTimeout: () => ({ dispose: () => undefined }) };
    const history = createStatusHistory({ store, clock });
    let previous: ProjectRead | undefined;
    let initialCount = initial.length;
    return {
        source,
        store,
        history,
        set: (path: string, content: string) => source.setFile(ROOT, path, content),
        remove: (path: string) => source.remove(ROOT, path),
        async observe(): Promise<void> {
            const current = await readProject(source, ROOT, VERSION);
            await history.observe(previous, current, deriveLifecycle(current));
            previous = current;
        },
        async baseline(): Promise<void> {
            await this.observe();
            store.records.length = 0;
            initialCount = 0;
        },
        added: () => store.records.slice(initialCount).map((stored) => stored.entry as Record<string, JsonValue>),
    };
}
