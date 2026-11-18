import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { specText } from '../lifecycle/testing/projects';
import { readProject } from '../specs/readProject';
import { parseReturnNote } from '../specs/returnNote';
import { generateProject } from '../specs/testing/generateProject';
import type { DetailView } from '../../shared/protocol/detail';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import type { BoardService } from './boardService';
import { parseStepTipSettings } from '../settings/stepTipSettings';
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
            return view.kind === 'spec' && view.progress?.criteria?.kind === 'criteria' ? view.progress.criteria.open.length : -1;
        };
        const before = shownCriteria();
        expect(before).toBeGreaterThanOrEqual(0);

        const targetPlan = model.lifecycle.entries.find((entry) => entry.key === target.key)?.plan;
        const empty = { state: 'empty' as const, raw: '' };
        const extended = {
            ...project,
            plans: project.plans.map((plan) =>
                plan.key === targetPlan && plan.parsed !== undefined
                    ? { ...plan, parsed: { ...plan.parsed, traceability: [...plan.parsed.traceability, { criterion: 'AC-999', steps: empty, code: empty, test: empty, manual: false, state: 'open', stateKnown: true, line: 99 }] } }
                    : plan,
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
        expect(detail.kind === 'spec' ? detail.history.statusHistory?.map((item) => item.new) : undefined).toEqual(['Active']);
        expect(seen.length).toBeGreaterThanOrEqual(1);
        expect(historyBest).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});

describe('0021 AC-011: a settings change reaches the detail within 500 ms on 200 specs (PD-047)', () => {
    let temp: string | undefined;
    afterEach(async () => {
        if (temp !== undefined) {
            await fs.rm(temp, { recursive: true, force: true });
        }
    });

    it('from the fake port event to the emitted detail', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'tips-perf-'));
        await generateProject(temp, 200);
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const w = createBoardWorld(model);
        disposables.push(w.service);
        w.selection.set({ stem: model.lifecycle.entries[0]!.stem });
        await w.service.whenIdle();
        let on = false;
        const best = await bestOfThree(async () => {
            on = !on;
            w.tips.set(parseStepTipSettings(on, {}));
            await w.service.whenIdle();
        });
        const view = w.service.detail();
        expect(view.kind === 'spec' && 'tips' in view.nextStep).toBe(on);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});

describe('0023 AC-012: a return note reaches the plan of the detail within 500 ms on 200 specs (PD-047)', () => {
    let temp: string | undefined;
    afterEach(async () => {
        if (temp !== undefined) {
            await fs.rm(temp, { recursive: true, force: true });
        }
    });

    it('a note that appears, changes and disappears', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-perf-'));
        await generateProject(temp, 200);
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const w = createBoardWorld(model);
        disposables.push(w.service);
        const target = project.specs.find((spec) => spec.folder === 'active')!;
        w.selection.set({ stem: model.lifecycle.entries.find((entry) => entry.key === target.key)!.stem });
        await w.service.whenIdle();
        const stageTwo = () => {
            const view = w.service.detail();
            const plan = view.kind === 'spec' ? view.plan : undefined;
            return plan?.kind === 'plan' ? plan.stages[1]!.groups.flatMap((group) => group.steps).find((entry) => entry.id === 'T-003') : undefined;
        };
        expect(stageTwo()?.state).not.toBe('returned');

        const withNote = (status: string) => {
            const key = `.memory-bank/activeContext.${target.number}-T-003.md`;
            const note = {
                key,
                modifiedMs: 1,
                size: 10,
                readable: true,
                number: target.number,
                stepId: 'T-003',
                parsed: parseReturnNote(`- **Status:** ${status}\n`, key),
                specKeys: [target.key],
                specReferences: [target.reference],
            };
            const next = {
                ...project,
                returnNotes: [...project.returnNotes, note],
                specs: project.specs.map((spec) => (spec.key === target.key ? { ...spec, returnNoteKeys: [...spec.returnNoteKeys, key] } : spec)),
            };
            return { project: next, lifecycle: deriveLifecycle(next) };
        };
        const appears = withNote('DONE');
        const appearedBest = await bestOfThree(async () => {
            w.source.set(appears);
            await w.service.whenIdle();
        });
        expect(stageTwo()?.returned).toEqual({ status: 'done' });
        expect(appearedBest).toBeLessThan(BUDGET_MS.uiFreshness);

        const changes = withNote('BLOCKED');
        const changedBest = await bestOfThree(async () => {
            w.source.set(changes);
            await w.service.whenIdle();
        });
        expect(stageTwo()?.returned?.status).toBe('blocked');
        expect(changedBest).toBeLessThan(BUDGET_MS.uiFreshness);

        const goneBest = await bestOfThree(async () => {
            w.source.set({ project: { ...project }, lifecycle: model.lifecycle });
            await w.service.whenIdle();
        });
        expect(stageTwo()?.returned).toBeUndefined();
        expect(goneBest).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});
