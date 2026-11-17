import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { createFakeHost } from '../discovery/testing/fakeHost';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { createSystemClock } from '../../adapters/node/systemClock';
import { createSpecRepository } from './specRepository';
import type { SpecChange } from './specRepository';
import { createFakeFileWatch } from './testing/fakeFileWatch';
import { generateProject } from './testing/generateProject';
import { createMemorySpecSource } from './testing/memorySpecSource';

const ROOT = 'memory://project';
const VERSION = '1.10.0';
const DEBOUNCE = 200;

function spec(plan = '_none yet_'): string {
    return `# Spec\n\n**Status:** In Progress\n**Plan:** ${plan}\n\n## 1. Summary\n\ntext\n`;
}

function plan(specLink: string, extra = ''): string {
    return `# Plan\n\n**Spec:** ${specLink}\n**Status:** In Progress\n${extra}`;
}

function setup() {
    const source = createMemorySpecSource();
    const watch = createFakeFileWatch();
    const clock = createFakeHost([]).clock;
    const repository = createSpecRepository({ source, watch, clock });
    const changes: SpecChange[] = [];
    repository.onDidChange((change) => changes.push(change));
    async function settle(): Promise<void> {
        clock.advance(DEBOUNCE);
        await repository.whenIdle();
    }
    return { source, watch, clock, repository, changes, settle };
}

describe('specRepository', () => {
    const cleanups: (() => Promise<void>)[] = [];
    afterEach(async () => {
        for (const cleanup of cleanups.splice(0)) {
            await cleanup();
        }
    });

    it('AC-018: a full read of a generated 200-spec project takes under 2 seconds and an update under 1 second after the event (PD-035)', async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'featherspec-perf-'));
        cleanups.push(() => fs.rm(directory, { recursive: true, force: true }));
        await generateProject(directory, 200);
        const watch = createFakeFileWatch();
        let repository = createSpecRepository({ source: createNodeSpecSource(), watch, clock: createSystemClock() });
        const fullRead = await bestOfThree(
            () => repository.open({ root: directory, version: VERSION }),
            () => {
                repository.dispose();
                repository = createSpecRepository({ source: createNodeSpecSource(), watch, clock: createSystemClock() });
            },
        );
        const snapshot = repository.snapshot();
        expect(snapshot?.specs).toHaveLength(200);
        expect(snapshot?.plans).toHaveLength(200);
        expect(snapshot?.returnNotes).toHaveLength(10);
        expect(snapshot?.diagnostics).toEqual([]);
        expect(fullRead).toBeLessThan(BUDGET_MS.fullRead);
        const target = path.join(directory, '.specs', 'active', '0001-generated-spec.md');
        const update = await bestOfThree(async () => {
            const updated = new Promise<void>((resolve) => {
                const subscription = repository.onDidChange(() => {
                    subscription.dispose();
                    resolve();
                });
            });
            await fs.appendFile(target, '\nedited\n');
            watch.fire(directory, '.specs/active/0001-generated-spec.md');
            await updated;
        });
        expect(update).toBeLessThan(BUDGET_MS.modelUpdate);
        expect(repository.snapshot()?.specs.find((entry) => entry.reference === '0001-generated-spec')?.parsed?.sections.map((section) => section.raw).join('')).toContain('edited');
        repository.dispose();
    });
});
