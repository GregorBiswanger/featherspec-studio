import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { Disposable } from '../ports/host';
import type { ShellModel } from '../ports/shell';
import { readProject } from '../specs/readProject';
import { generateProject } from '../specs/testing/generateProject';
import { createFakeSource } from '../board/testing/boardWorld';
import { createSpecTreeService } from './specTreeService';
import type { GroupModel } from './specTree';

describe('0020 AC-013: the tree on 200 specs (core part)', () => {
    let temp: string | undefined;
    afterEach(async () => {
        if (temp !== undefined) {
            await fs.rm(temp, { recursive: true, force: true });
        }
    });

    it('a model notification reaches the tree listener within 500 ms (PD-047)', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'tree-perf-'));
        await generateProject(temp, 200);
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model: ShellModel = { project, lifecycle: deriveLifecycle(project) };
        const source = createFakeSource(model);
        const viewListeners = new Set<() => void>();
        const folder = { root: temp, name: 'perf', verdict: 'project' as const };
        const service = createSpecTreeService({
            shell: {
                view: () => ({ state: undefined, restricted: false, projectName: 'perf', area: 'overview', target: undefined, selection: undefined, notice: undefined, rows: [] }),
                onDidChangeView: (listener): Disposable => {
                    viewListeners.add(() => listener(undefined as never));
                    return { dispose: () => void viewListeners.clear() };
                },
            },
            source,
            discovery: {
                snapshot: () => ({ result: undefined, active: folder as never, remembered: undefined, failure: undefined }),
                onDidUpdate: (): Disposable => ({ dispose: () => undefined }),
            },
            sameRoot: (first, second) => first === second,
        });
        try {
            const groups = (service.model().items as GroupModel[]).flatMap((group) => group.children);
            expect(groups).toHaveLength(200);
            let heard = 0;
            service.onDidChange(() => {
                heard += 1;
            });
            let round = 0;
            const best = await bestOfThree(async () => {
                round += 1;
                const changed = deriveLifecycle({ ...project, specs: project.specs.slice(0, 200 - round) });
                source.set({ project: { ...project, specs: project.specs.slice(0, 200 - round) }, lifecycle: changed });
            });
            expect(heard).toBeGreaterThanOrEqual(3);
            expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        } finally {
            service.dispose();
        }
    });
});
