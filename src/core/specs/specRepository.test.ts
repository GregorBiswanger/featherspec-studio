import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { createFakeHost } from '../discovery/testing/fakeHost';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { createSystemClock } from '../../adapters/node/systemClock';
import { readProject } from './readProject';
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

    it('AC-022: open performs a full read, publishes a complete snapshot and watches the root', async () => {
        const { source, watch, repository } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        expect(repository.snapshot()).toBeUndefined();
        await repository.open({ root: ROOT, version: VERSION });
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0001-a']);
        expect(watch.watched()).toEqual([ROOT]);
    });

    it('AC-012: a changed spec file is re-read and its reference is notified, after the debounce', async () => {
        const { source, watch, repository, changes, clock, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        source.setFile(ROOT, '.specs/active/0002-b.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        source.setFile(ROOT, '.specs/active/0001-a.md', `${spec()}\nmore\n`);
        watch.fire(ROOT, '.specs/active/0001-a.md');
        await repository.whenIdle();
        expect(changes).toEqual([]);
        clock.advance(DEBOUNCE - 1);
        await repository.whenIdle();
        expect(changes).toEqual([]);
        await settle();
        expect(changes).toEqual([{ references: ['0001-a'], untied: false, cause: 'files' }]);
        expect(repository.snapshot()?.specs[0]?.parsed?.sections[0]?.raw).toContain('more');
    });

    it('AC-012: a burst of events yields one notification and one final state', async () => {
        const { source, watch, repository, changes, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        for (let index = 0; index < 20; index++) {
            source.setFile(ROOT, '.specs/active/0001-a.md', `${spec()}\nedit ${index}\n`);
            watch.fire(ROOT, '.specs/active/0001-a.md');
        }
        await settle();
        expect(changes).toHaveLength(1);
        expect(repository.snapshot()?.specs[0]?.parsed?.sections[0]?.raw).toContain('edit 19');
    });

    it('AC-012: a linked plan change names the spec; a gained link and a lost link name it too', async () => {
        const { source, watch, repository, changes, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('[p](0001-a.plan.md)'));
        source.setFile(ROOT, '.specs/active/0002-b.md', spec());
        source.setFile(ROOT, '.specs/active/0001-a.plan.md', plan('[s](0001-a.md)'));
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        source.setFile(ROOT, '.specs/active/0001-a.plan.md', plan('[s](0001-a.md)', 'x\n'));
        watch.fire(ROOT, '.specs/active/0001-a.plan.md');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0001-a'], untied: false, cause: 'files' });
        source.setFile(ROOT, '.specs/active/0002-b.plan.md', plan('[s](0002-b.md)'));
        watch.fire(ROOT, '.specs/active/0002-b.plan.md');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0002-b'], untied: false, cause: 'files' });
        expect(repository.snapshot()?.specs[1]?.planKeys).toEqual(['.specs/active/0002-b.plan.md']);
        source.remove(ROOT, '.specs/active/0001-a.plan.md');
        watch.fire(ROOT, '.specs/active/0001-a.plan.md');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0001-a'], untied: false, cause: 'files' });
        expect(repository.snapshot()?.specs[0]?.planKeys).toEqual([]);
    });

    it('AC-012: a return note names its spec; an unlinked note and an orphan plan only set untied', async () => {
        const { source, watch, repository, changes, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        source.setFile(ROOT, '.memory-bank/activeContext.0001-T-001.md', '- **Status:** DONE');
        watch.fire(ROOT, '.memory-bank/activeContext.0001-T-001.md');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0001-a'], untied: false, cause: 'files' });
        source.setFile(ROOT, '.memory-bank/activeContext.0099-T-001.md', '- **Status:** DONE');
        watch.fire(ROOT, '.memory-bank/activeContext.0099-T-001.md');
        await settle();
        expect(changes.pop()).toEqual({ references: [], untied: true, cause: 'files' });
        source.setFile(ROOT, '.specs/active/0050-lost.plan.md', plan('[s](0050-lost.md)'));
        watch.fire(ROOT, '.specs/active/0050-lost.plan.md');
        await settle();
        expect(changes.pop()).toEqual({ references: [], untied: true, cause: 'files' });
    });

    it('AC-012 / AC-002: a move to another folder keeps the reference, a stem change notifies both references, a delete notifies the removed one', async () => {
        const { source, watch, repository, changes, settle } = setup();
        source.setFile(ROOT, '.specs/backlog/0001-a.md', spec());
        source.setFile(ROOT, '.specs/backlog/0002-b.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        source.move(ROOT, '.specs/backlog/0001-a.md', '.specs/active/0001-a.md');
        watch.fire(ROOT, '.specs/backlog/0001-a.md');
        watch.fire(ROOT, '.specs/active/0001-a.md');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0001-a'], untied: false, cause: 'files' });
        expect(repository.snapshot()?.specs.map((entry) => entry.key)).toEqual(['.specs/active/0001-a.md', '.specs/backlog/0002-b.md']);
        source.move(ROOT, '.specs/backlog/0002-b.md', '.specs/backlog/0002-renamed.md');
        watch.fire(ROOT, '.specs/backlog/0002-b.md');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0002-b', '0002-renamed'], untied: false, cause: 'files' });
        source.remove(ROOT, '.specs/backlog');
        watch.fire(ROOT, '.specs/backlog');
        await settle();
        expect(changes.pop()).toEqual({ references: ['0002-renamed'], untied: false, cause: 'files' });
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0001-a']);
    });

    it('AC-012: a file changed without an event is found by its modification time when another event arrives', async () => {
        const { source, watch, repository, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        source.setFile(ROOT, '.specs/active/0002-b.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        source.setFile(ROOT, '.specs/active/0001-a.md', `${spec()}\nsilent\n`);
        source.setFile(ROOT, '.specs/active/0003-c.md', spec());
        watch.fire(ROOT, '.specs/active/0003-c.md');
        await settle();
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0001-a', '0002-b', '0003-c']);
        expect(repository.snapshot()?.specs[0]?.parsed?.sections[0]?.raw).toContain('silent');
    });

    it('AC-012: an event for a file whose size and time did not change still forces a re-read of that file only', async () => {
        const { source, watch, repository, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec(), 5_000);
        await repository.open({ root: ROOT, version: VERSION });
        source.setFile(ROOT, '.specs/active/0001-a.md', spec().replace('text', 'TEXT'), 5_000);
        const readsBefore = source.reads().length;
        watch.fire(ROOT, '.specs/active/0001-a.md');
        await settle();
        expect(source.reads().length - readsBefore).toBe(1);
        expect(repository.snapshot()?.specs[0]?.parsed?.sections[0]?.raw).toContain('TEXT');
    });

    it('AC-012: files that did not change are not read again', async () => {
        const { source, watch, repository, settle } = setup();
        for (let index = 1; index <= 5; index++) {
            source.setFile(ROOT, `.specs/active/000${index}-s.md`, spec());
        }
        await repository.open({ root: ROOT, version: VERSION });
        const readsBefore = source.reads().length;
        source.setFile(ROOT, '.specs/active/0003-s.md', `${spec()}x`);
        watch.fire(ROOT, '.specs/active/0003-s.md');
        await settle();
        expect(source.reads().slice(readsBefore)).toEqual(['.specs/active/0003-s.md']);
    });

    it('AC-012: events are mapped to keys case-insensitively when the platform says so', async () => {
        const source = createMemorySpecSource();
        const watch = createFakeFileWatch();
        const clock = createFakeHost([]).clock;
        const repository = createSpecRepository({ source, watch, clock, caseInsensitiveEvents: true });
        source.setFile(ROOT, '.specs/active/0001-a.md', spec(), 5_000);
        await repository.open({ root: ROOT, version: VERSION });
        source.setFile(ROOT, '.specs/active/0001-a.md', spec().replace('text', 'TEXT'), 5_000);
        watch.fire(ROOT, '.SPECS/Active/0001-A.md');
        clock.advance(DEBOUNCE);
        await repository.whenIdle();
        expect(repository.snapshot()?.specs[0]?.parsed?.sections[0]?.raw).toContain('TEXT');
    });

    it('AC-012: after a series of mixed changes the model equals a fresh full read', async () => {
        const { source, watch, repository, settle } = setup();
        source.setFile(ROOT, '.specs/backlog/0001-a.md', spec('[p](0001-a.plan.md)'));
        source.setFile(ROOT, '.specs/backlog/0001-a.plan.md', plan('[s](0001-a.md)'));
        source.setFile(ROOT, '.specs/done/0002-b.md', spec());
        source.setFile(ROOT, '.memory-bank/activeContext.0002-T-001.md', '- **Status:** BLOCKED');
        await repository.open({ root: ROOT, version: VERSION });
        const events: string[] = [];
        source.move(ROOT, '.specs/backlog/0001-a.md', '.specs/active/0001-a.md');
        source.move(ROOT, '.specs/backlog/0001-a.plan.md', '.specs/active/0001-a.plan.md');
        events.push('.specs/backlog/0001-a.md', '.specs/active/0001-a.md', '.specs/backlog/0001-a.plan.md', '.specs/active/0001-a.plan.md');
        source.remove(ROOT, '.memory-bank/activeContext.0002-T-001.md');
        events.push('.memory-bank/activeContext.0002-T-001.md');
        source.setFile(ROOT, '.specs/plan-archive/0002-b.2026-11-16.plan.md', plan('[s](../done/0002-b.md)'));
        events.push('.specs/plan-archive/0002-b.2026-11-16.plan.md');
        source.setFile(ROOT, '.specs/done/0003-c.md', 'broken');
        source.setUnreadable(ROOT, '.specs/done/0004-d.md', 'EACCES');
        events.push('.specs/done/0003-c.md', '.specs/done/0004-d.md');
        for (const event of events) {
            watch.fire(ROOT, event);
        }
        await settle();
        expect(repository.snapshot()).toEqual(await readProject(source, ROOT, VERSION));
    });

    it('AC-022: rescan replaces the model with a fresh read and notifies, also when nothing changed', async () => {
        const { source, repository, changes } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        source.setFile(ROOT, '.specs/active/0002-missed.md', spec());
        await repository.rescan();
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0001-a', '0002-missed']);
        expect(changes).toEqual([{ references: ['0002-missed'], untied: false, cause: 'rescan' }]);
        await repository.rescan();
        expect(changes.pop()).toEqual({ references: [], untied: false, cause: 'rescan' });
    });

    it('AC-022: reporting the project again gives a fresh full read and exactly one watcher', async () => {
        const { source, watch, repository, changes } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        const reads = source.reads().length;
        await repository.open({ root: ROOT, version: '1.9.0' });
        expect(source.reads().length).toBeGreaterThan(reads);
        expect(watch.watched()).toEqual([ROOT]);
        expect(repository.snapshot()?.version).toBe('1.9.0');
        expect(changes).toHaveLength(1);
        expect(changes[0]?.cause).toBe('project');
    });

    it('AC-022: another project replaces the model and moves the watcher; no project stops watching and discards the model', async () => {
        const { source, watch, repository, changes } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        source.setFile('memory://other', '.specs/active/0009-z.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        await repository.open({ root: 'memory://other', version: VERSION });
        expect(watch.watched()).toEqual(['memory://other']);
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0009-z']);
        expect(changes.pop()).toEqual({ references: ['0001-a', '0009-z'], untied: true, cause: 'project' });
        await repository.open(undefined);
        expect(watch.watched()).toEqual([]);
        expect(repository.snapshot()).toBeUndefined();
        expect(changes.pop()).toEqual({ references: ['0009-z'], untied: true, cause: 'project' });
    });

    it('AC-022: a pending event of the old project does not touch the model of the new one', async () => {
        const { source, watch, repository, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        source.setFile('memory://other', '.specs/active/0009-z.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        watch.fire(ROOT, '.specs/active/0001-a.md');
        await repository.open({ root: 'memory://other', version: VERSION });
        await settle();
        expect(repository.snapshot()?.root).toBe('memory://other');
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0009-z']);
    });

    it('AC-022: dispose stops watching and later events change nothing', async () => {
        const { source, watch, repository, changes, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        changes.length = 0;
        repository.dispose();
        expect(watch.watched()).toEqual([]);
        source.setFile(ROOT, '.specs/active/0002-b.md', spec());
        watch.fire(ROOT, '.specs/active/0002-b.md');
        await settle();
        expect(changes).toEqual([]);
    });

    it('AC-012: a snapshot a consumer holds is never changed by a later update', async () => {
        const { source, watch, repository, settle } = setup();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec());
        await repository.open({ root: ROOT, version: VERSION });
        const held = repository.snapshot();
        const copy = JSON.stringify(held);
        source.setFile(ROOT, '.specs/active/0002-b.md', spec());
        watch.fire(ROOT, '.specs/active/0002-b.md');
        await settle();
        expect(JSON.stringify(held)).toBe(copy);
        expect(repository.snapshot()).not.toBe(held);
    });

    it('AC-013: reading and processing one watched change creates, changes, renames and deletes no file', async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'featherspec-readonly-'));
        cleanups.push(() => fs.rm(directory, { recursive: true, force: true }));
        await fs.cp(fixturePath('fs110-parallel-synthetic'), directory, { recursive: true });
        const source = createNodeSpecSource();
        const watch = createFakeFileWatch();
        const clock = createFakeHost([]).clock;
        const repository = createSpecRepository({ source, watch, clock });
        const before = await snapshotTree(directory);
        await repository.open({ root: directory, version: VERSION });
        expect(await snapshotTree(directory)).toEqual(before);
        const own = path.join('.specs', 'active', '0001-parallel-demo.md');
        await fs.appendFile(path.join(directory, own), '\nthe test itself edits this file\n');
        watch.fire(directory, '.specs/active/0001-parallel-demo.md');
        clock.advance(DEBOUNCE);
        await repository.whenIdle();
        await repository.rescan();
        const after = await snapshotTree(directory);
        const withoutOwn = (lines: string[]): string[] => lines.filter((line) => !line.startsWith(`${own}|`));
        expect(withoutOwn(after)).toEqual(withoutOwn(before));
        expect(after.length).toBe(before.length);
        expect(repository.snapshot()?.specs[0]?.parsed?.sections.map((section) => section.raw).join('')).toContain('the test itself edits');
    });

    it('AC-018: a full read of a generated 200-spec project takes under 2 seconds and an update under 1 second after the event', async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'featherspec-perf-'));
        cleanups.push(() => fs.rm(directory, { recursive: true, force: true }));
        await generateProject(directory, 200);
        const watch = createFakeFileWatch();
        const repository = createSpecRepository({ source: createNodeSpecSource(), watch, clock: createSystemClock() });
        const started = performance.now();
        await repository.open({ root: directory, version: VERSION });
        const fullRead = performance.now() - started;
        const snapshot = repository.snapshot();
        expect(snapshot?.specs).toHaveLength(200);
        expect(snapshot?.plans).toHaveLength(200);
        expect(snapshot?.returnNotes).toHaveLength(10);
        expect(snapshot?.diagnostics).toEqual([]);
        expect(fullRead).toBeLessThan(2000);
        const updated = new Promise<number>((resolve) => {
            repository.onDidChange(() => resolve(performance.now()));
        });
        const target = path.join(directory, '.specs', 'active', '0001-generated-spec.md');
        await fs.appendFile(target, '\nedited\n');
        const fired = performance.now();
        watch.fire(directory, '.specs/active/0001-generated-spec.md');
        const finished = await updated;
        expect(finished - fired).toBeLessThan(1000);
        expect(repository.snapshot()?.specs.find((entry) => entry.reference === '0001-generated-spec')?.parsed?.sections.map((section) => section.raw).join('')).toContain('edited');
        repository.dispose();
    });
});
