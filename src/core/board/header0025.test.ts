import { describe, expect, it } from 'vitest';
import { fixtureModel } from '../planMap/testing/plans';
import { buildDetail } from './detail';
import { nextStep } from './nextStep';
import { splitterFiles, TIP_SPLITTER_STEPS } from './testing/caseFixtures';
import { modelOf } from './testing/boardWorld';

const NO_HISTORY = { available: true as const, label: '', entries: [] };

describe('0025 AC-009: the detail the map header shows carries nextStep()\'s lines', () => {
    it.each(['fs110-parallel-synthetic', 'fs-partial-return', 'studio-0015'])('0025 AC-009: every map-able spec of %s: the first line of the detail equals nextStep()\'s', async (name) => {
        const model = await fixtureModel(name);
        const mapable = model.lifecycle.entries.filter((entry) => entry.state !== 'Done' && entry.plan !== undefined);
        expect(mapable.length).toBeGreaterThan(0);
        for (const entry of mapable) {
            const view = buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: NO_HISTORY });
            const next = nextStep(model, entry.key);
            if (view.kind !== 'spec' || next === undefined || !('lines' in next) || !('lines' in view.nextStep)) {
                continue;
            }
            const quiet = 'quiet' in view.nextStep && view.nextStep.quiet === true;
            expect(view.nextStep.lines[0]).toMatchObject(quiet ? { text: next.lines[0]!.text, intent: expect.stringMatching(/^When T-\d+( and T-\d+)* (is|are) back: integrate the returned steps$/) } : { text: next.lines[0]!.text, intent: next.lines[0]!.intent });
        }
    });

    it('0025 AC-009: a plan with every step ticked and status In Progress gives /sdd-compile as the first line', async () => {
        const model = await modelOf(splitterFiles({ ticked: TIP_SPLITTER_STEPS.map(([id]) => id), status: 'In Progress' }));
        const entry = model.lifecycle.entries[0]!;
        const view = buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: NO_HISTORY });
        if (view.kind !== 'spec' || !('lines' in view.nextStep)) {
            throw new Error('expected lines');
        }
        expect(view.nextStep.lines[0]?.text).toMatch(/^\/sdd-compile /);
        expect(view.plan?.kind).toBe('plan');
    });
});
