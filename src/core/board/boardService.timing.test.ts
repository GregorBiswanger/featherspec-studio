import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { specText } from '../lifecycle/testing/projects';
import { readProject } from '../specs/readProject';
import { generateProject } from '../specs/testing/generateProject';
import type { DetailView } from '../../shared/protocol/detail';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import type { BoardService } from './boardService';
import { createBoardWorld, modelOf, type BoardWorld } from './testing/boardWorld';

const NINE: Record<string, string> = {};
for (let number = 1; number <= 9; number += 1) {
    NINE[`.specs/backlog/000${number}-s${number}.md`] = specText();
}
NINE['.specs/active/0010-act.md'] = specText({ status: 'In Progress' });

const disposables: BoardService[] = [];
afterEach(() => disposables.splice(0).forEach((service) => service.dispose()));

async function world(files = NINE): Promise<BoardWorld> {
    const created = createBoardWorld(await modelOf(files));
    disposables.push(created.service);
    await created.service.whenIdle();
    return created;
}

function shown(w: BoardWorld): string[] {
    return w.service.view()!.columns.flatMap((column) => column.cards.map((card) => card.number));
}

describe('board service: freshness on 200 specs (AC-019, core part)', () => {
    let temp: string | undefined;
    afterEach(async () => {
        if (temp !== undefined) {
            await fs.rm(temp, { recursive: true, force: true });
        }
    });

    it('a model notification reaches the view within 500 ms (PD-047)', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-perf-'));
        await generateProject(temp, 200);
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const w = createBoardWorld(model);
        disposables.push(w.service);
        await w.service.whenIdle();
        w.service.setDone(true);
        expect(w.service.view()!.columns.flatMap((column) => column.cards)).toHaveLength(200);

        const next = { project: { ...project }, lifecycle: deriveLifecycle(project) };
        const modelBest = await bestOfThree(async () => {
            w.source.set({ project: { ...project }, lifecycle: next.lifecycle });
            await w.service.whenIdle();
        });
        expect(modelBest).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});

describe('board service: detail freshness on 200 specs (AC-019, core part for the detail view)', () => {
    let temp: string | undefined;
    afterEach(async () => {
        if (temp !== undefined) {
            await fs.rm(temp, { recursive: true, force: true });
        }
    });

    it('a model notification and a status history notification reach the detail of the selected spec within 500 ms each (PD-047)', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'detail-perf-'));
        await generateProject(temp, 200);
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const w = createBoardWorld(model);
        disposables.push(w.service);
        const target = project.specs[0]!;
        w.selection.set({ stem: model.lifecycle.entries.find((entry) => entry.key === target.key)!.stem });
        await w.service.whenIdle();
        const seen: DetailView[] = [];
        w.service.onDidChangeDetail((view) => seen.push(view));
        const shownCriteria = () => {
            const view = w.service.detail();
            return view.kind === 'spec' ? view.sections.criteria.items.length : -1;
        };
        const before = shownCriteria();
        expect(before).toBeGreaterThanOrEqual(0);

        const extended = {
            ...project,
            specs: project.specs.map((spec) =>
                spec.key === target.key && spec.parsed !== undefined
                    ? { ...spec, parsed: { ...spec.parsed, criteria: [...spec.parsed.criteria, { id: 'AC-999', text: '**AC-999** added', illustration: undefined, line: 1, uncertain: false, struck: false }] } }
                    : spec,
            ),
        };
        const extendedModel = { project: extended, lifecycle: deriveLifecycle(extended) };
        const modelBest = await bestOfThree(async () => {
            w.source.set({ project: extendedModel.project, lifecycle: extendedModel.lifecycle });
            await w.service.whenIdle();
        });
        expect(modelBest).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(shownCriteria()).toBe(before + 1);
        expect(seen.length).toBeGreaterThanOrEqual(1);
        seen.length = 0;

        const stem = w.service.detail().kind === 'spec' ? (w.service.detail() as { stem: string }).stem : '';
        w.history.view = {
            available: true,
            label: 'Observed by Studio while it was running — not a reconstruction',
            entries: [{ observedAt: '2026-11-16T09:00:00Z', stem, old: 'Ready', new: 'Active', rule: 'S-ACTIVE', cause: { kind: 'first-observed' }, flow: 'not checked' }],
        };
        const historyBest = await bestOfThree(async () => {
            w.history.notify();
            await w.service.whenIdle();
        });
        const detail = w.service.detail();
        expect(detail.kind === 'spec' ? detail.sections.history.statusHistory?.map((item) => item.new) : undefined).toEqual(['Active']);
        expect(seen.length).toBeGreaterThanOrEqual(1);
        expect(historyBest).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});
