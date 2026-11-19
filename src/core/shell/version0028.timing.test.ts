import { afterEach, describe, expect, it } from 'vitest';
import { buildDetail } from '../board/detail';
import { splitterFiles } from '../board/testing/caseFixtures';
import { createProjectLine } from '../copyNextStep/projectLine';
import { createStatusEntry } from '../copyNextStep/statusEntry';
import { buildOverviewView } from '../overview/overviewView';
import type { StatusEntryView } from '../ports/copyNextStep';
import { BUDGET_MS } from '../../shared/testing/timing';
import { createModelSource } from './modelSource';
import { createSpecTreeService, type SpecTreeService } from './specTreeService';
import type { GroupModel } from './specTree';
import { addProject, createShellWorld, type ShellWorld } from './testing/world';

const KEY = '.specs/active/0001-tip-splitter.md';
const FILES = splitterFiles({ ticked: ['T-001', 'T-002'], currentStep: 'T-004' });
const REPORT = 'Let the agent report first — the plan and the ticks may differ';

let world: ShellWorld | undefined;
let tree: SpecTreeService | undefined;
let entry: { dispose(): void } | undefined;

afterEach(() => {
    entry?.dispose();
    tree?.dispose();
    world?.dispose();
    entry = undefined;
    tree = undefined;
    world = undefined;
});

interface Started {
    world: ShellWorld;
    source: ReturnType<typeof createModelSource>;
    bar: () => string | undefined;
    row: () => string;
}

async function started(version: string | undefined): Promise<Started> {
    world = createShellWorld();
    addProject(world, 'proj', FILES);
    setVersion(world, version);
    const source = createModelSource(world.repository);
    tree = createSpecTreeService({ shell: world.service, source, discovery: world.controller, sameRoot: (first, second) => first === second });
    let shown: StatusEntryView | 'hidden' | undefined;
    entry = createStatusEntry({
        line: createProjectLine(),
        discovery: world.controller,
        shell: world.service,
        source,
        item: { show: (next) => void (shown = next), hide: () => void (shown = 'hidden') },
        clock: world.host.clock,
        sameRoot: (first, second) => first === second,
    });
    await world.controller.start();
    await world.settle();
    const current = world;
    const service = tree;
    return {
        world: current,
        source,
        bar: () => (shown === undefined || shown === 'hidden' ? undefined : shown.text),
        row: () => (service.model().items as GroupModel[]).flatMap((group) => group.children)[0]!.description,
    };
}

function setVersion(target: ShellWorld, version: string | undefined): void {
    const text = version === undefined ? '# Constitution\n' : `FeatherSpecVersion: ${version}\n`;
    target.discoveryFs.setFile('proj', 'AGENTS.md', text);
    target.specs.setFile('proj', 'AGENTS.md', text);
    target.discoveryFs.setFile('proj', '.claude/commands/sdd-plan.md', 'x');
}

async function change(current: Started, version: string | undefined): Promise<number> {
    const started = performance.now();
    setVersion(current.world, version);
    current.world.host.watch.fire('proj');
    current.world.host.clock.advance(200);
    await current.world.controller.whenIdle();
    await current.world.settle();
    return performance.now() - started;
}

function surfaces(current: Started): { detail: string; overview: string; tree: string; bar: string | undefined } {
    const model = current.source.current()!;
    const history = { available: true as const, label: 'Observed', entries: [] };
    const detail = buildDetail({ selection: { stem: '0001-tip-splitter', path: KEY }, model, history });
    const overview = buildOverviewView({ model, history });
    return {
        detail: detail.kind === 'spec' && 'lines' in detail.nextStep ? detail.nextStep.lines.map((line) => line.intent).join(' | ') : '',
        overview: overview.now.rows[0]?.step?.intent ?? '',
        tree: current.row(),
        bar: current.bar(),
    };
}

const REPORT_FIRST = { detail: expect.stringContaining(REPORT), overview: 'Report', tree: '/sdd-plan', bar: '$(checklist) 0001 · Active · /sdd-plan' };
const VARIANT_A = { detail: expect.stringContaining('Continue with T-003 Reject money values'), overview: 'Continue', tree: 'Implement T-003', bar: '$(checklist) 0001 · Active · Implement T-003' };

describe('0028 AC-019: a FeatherSpecVersion change shows the case of the new value in every surface within 500 ms', () => {
    it('1.10.0 to 1.11.0 and back: Report first, variant A, Report first', async () => {
        const current = await started('1.10.0');
        expect(surfaces(current)).toMatchObject(REPORT_FIRST);
        expect(await change(current, '1.11.0')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(surfaces(current)).toMatchObject(VARIANT_A);
        expect(await change(current, '1.10.0')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(surfaces(current)).toMatchObject(REPORT_FIRST);
    });

    it('to next and with the line removed: Report first; selection and area stay', async () => {
        const current = await started('1.11.0');
        expect(surfaces(current)).toMatchObject(VARIANT_A);
        current.world.service.select({ stem: '0001-tip-splitter' });
        const area = current.world.service.view().area;
        expect(await change(current, 'next')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(surfaces(current)).toMatchObject(REPORT_FIRST);
        expect(await change(current, '1.12.0')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(surfaces(current)).toMatchObject(VARIANT_A);
        expect(await change(current, undefined)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(surfaces(current)).toMatchObject(REPORT_FIRST);
        expect(current.world.service.view().selection).toMatchObject({ stem: '0001-tip-splitter' });
        expect(current.world.service.view().area).toBe(area);
    });

    it('negative control: a change from 1.10.0 to 1.9.0 switches nothing', async () => {
        const current = await started('1.10.0');
        const before = surfaces(current);
        expect(await change(current, '1.9.0')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(surfaces(current)).toEqual(before);
    });
});
