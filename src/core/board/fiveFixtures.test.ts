import { afterEach, describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { classifyFolder } from '../discovery/classifyFolder';
import { fixturePath } from '../discovery/testing/fixtures';
import { createEntryWorld, type EntryWorld } from '../copyNextStep/testing/entryWorld';
import { nextStep, stepView } from './nextStep';
import { modelOfFixture } from './testing/nextStepSnapshot';

const KEY = '.specs/active/0001-fixture-demo.md';
const PLAN = '.specs/active/0001-fixture-demo.plan.md';

interface Row {
    fixture: string;
    case: string;
    first: string;
    second?: string;
    short: string;
    bar: string;
}

const REPORT = { first: `/sdd-plan ${KEY}`, second: `Implement T-003 of ${PLAN}`, short: 'Report · /sdd-plan', bar: '$(checklist) 0001 · Active · /sdd-plan' };

const ROWS: Row[] = [
    { fixture: 'fs-version-missing', case: 'NS-6-report', ...REPORT },
    { fixture: 'fs-version-1100', case: 'NS-6-report', ...REPORT },
    { fixture: 'fs-version-1110', case: 'NS-6-open', first: `Implement T-003 of ${PLAN}`, second: `/sdd-plan ${KEY}`, short: 'Continue · Implement T-003', bar: '$(checklist) 0001 · Active · Implement T-003' },
    { fixture: 'fs-partial-return', case: 'NS-6-returned', first: `/sdd-plan ${KEY}`, short: 'Integrate · /sdd-plan', bar: '$(checklist) 0001 · Active · /sdd-plan' },
];

let world: EntryWorld | undefined;

afterEach(() => world?.dispose());

describe('0028 AC-021: the five fs-* fixtures give spec 0001 the case of their version, in the next-step rules and the status bar', () => {
    it.each(ROWS)('$fixture: nextStep() gives $case', async (row) => {
        const model = await modelOfFixture(row.fixture);
        const next = nextStep(model, KEY);
        expect(next).toMatchObject({ rule: 'NS-6', case: row.case });
        const texts = (next as { lines: Array<{ text: string }> }).lines.map((line) => line.text);
        expect(texts).toEqual(row.second === undefined ? [row.first] : [row.first, row.second]);
        expect(stepView(model, KEY)).toMatchObject({ intent: row.short.split(' · ')[0], short: row.short.split(' · ')[1] });
    });

    it.each(ROWS)('$fixture: the status bar reads $bar', async (row) => {
        world = createEntryWorld();
        const model = await modelOfFixture(row.fixture);
        world.setModel(model);
        world.setProjects([{ name: 'proj', root: model.project.root }], 'proj');
        expect(world.text()).toBe(row.bar);
    });

    it('fs-version-missing is read as a legacy project (OP-005, PD-031)', async () => {
        const result = await classifyFolder(createNodeFileSystem(), fixturePath('fs-version-missing'));
        expect(result).toMatchObject({ verdict: 'project', legacy: true });
        expect((await modelOfFixture('fs-version-missing')).project.version).toBe('unknown');
    });
});
