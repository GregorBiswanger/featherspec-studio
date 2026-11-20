import * as fs from 'fs';
import { describe, expect, it } from 'vitest';
import { allBaselineNames, modelOfBaseline, readBaseline, snapshotFile, snapshotOf, translated, type ProjectSnapshot, type SpecSnapshot } from './testing/nextStepSnapshot';

type Field = keyof SpecSnapshot;

interface Exception {
    snapshot: string;
    key: string;
    fields: Field[];
    why: string;
}


const SPLITTER = '.specs/active/0001-tip-splitter.md';
const ALL_FIELDS: Field[] = ['state', 'rule', 'persistence', 'nextStep', 'stepView', 'tips'];
const DEMO = '.specs/active/0001-fixture-demo.md';
const STEP_FIELDS: Field[] = ['nextStep', 'stepView', 'tips'];
const SIGN_OLD = 'Report first: the sign of 0028 §6.2 below FeatherSpec 1.11.0 (AC-004, AC-009)';
const READY = '.specs/backlog/0001-tip-splitter.md';
const NS7 = 'NS-7 starts with Implement <ID> of <plan path>; without an open step with /sdd-plan (0028 §6.5, AC-016); a Ready spec without a tick starts with /sdd-lifecycle <spec> In Progress, Implement follows in active/ (0033 §6.1, §6.2)';
const NS7_ACTIVE = 'an active/ spec with no tick starts with Start implementing, one line (0033 §6.2, AC-002)';
const GUARD = 'Report first: a step with a Verified line but no tick (0028 §6.6, AC-017)';
const REASON = "the session reason of the current or new chat from 1.11.0 (0028 §6.4, AC-020)";
const FINISHED_NOT_DONE = 'an active/ spec with a finished plan whose status is not Done is Review (0028 §6.1)';

export const EXCEPTIONS: readonly Exception[] = [
    { snapshot: 'fs110-ready-synthetic', key: '.specs/backlog/0001-ready-feature.md', fields: STEP_FIELDS, why: NS7 },
    { snapshot: 'case-ac016-ready-with-step', key: READY, fields: STEP_FIELDS, why: NS7 },
    { snapshot: 'case-ac016-ready-without-step', key: READY, fields: STEP_FIELDS, why: NS7 },
    { snapshot: 'case-ac016-ready-all-struck', key: READY, fields: STEP_FIELDS, why: NS7 },
    { snapshot: 'fs-verified-no-tick', key: DEMO, fields: STEP_FIELDS, why: GUARD },
    { snapshot: 'case-ac004-verified-no-tick', key: SPLITTER, fields: STEP_FIELDS, why: GUARD },
    { snapshot: 'fs-version-1110', key: DEMO, fields: ['tips'], why: REASON },
    { snapshot: 'fs-partial-return', key: DEMO, fields: ['tips'], why: REASON },
    { snapshot: 'fs-version-missing', key: DEMO, fields: STEP_FIELDS, why: SIGN_OLD },
    { snapshot: 'fs-version-1100', key: DEMO, fields: STEP_FIELDS, why: SIGN_OLD },
    { snapshot: 'case-ac004-report-first', key: SPLITTER, fields: STEP_FIELDS, why: SIGN_OLD },
    { snapshot: 'repo-f9cadb4', key: '.specs/active/0028-plan-state-aware-next-step.md', fields: STEP_FIELDS, why: NS7_ACTIVE },
    ...['ac001-plan-in-progress', 'ac001-plan-not-started', 'ac001-plan-no-status', 'ac001-in-progress-with-done-note'].map((name) => ({
        snapshot: `case-${name}`,
        key: SPLITTER,
        fields: ALL_FIELDS,
        why: FINISHED_NOT_DONE,
    })),
];

function read(name: string): ProjectSnapshot {
    return readBaseline(name);
}

const RESUME_TEXTS = 'Plan without open step has the effect and then-sentence of 0028 §7 (AC-002)';

function isResume(value: SpecSnapshot): boolean {
    return (value.nextStep as { case?: string } | null)?.case === 'NS-6-resume';
}

function masked(snapshot: string, key: string, value: SpecSnapshot): Partial<SpecSnapshot> {
    const rule = EXCEPTIONS.find((candidate) => candidate.snapshot === snapshot && candidate.key === key);
    const copy: Partial<SpecSnapshot> = { ...value };
    rule?.fields.forEach((field) => delete copy[field]);
    if (isResume(value)) {
        delete copy.tips;
    }
    return copy;
}

describe('0028 AC-010: every spec of every fixture project and of this repository keeps state, rule and next step', () => {
    it('each snapshot written on the Baseline equals the head, apart from the named exceptions', async () => {
        const names = await allBaselineNames();
        expect(names.length).toBeGreaterThan(30);
        for (const entry of names) {
            const name = entry.kind === 'case' ? `case-${entry.name}` : entry.name;
            const expected = read(name);
            const actual = snapshotOf(await modelOfBaseline(entry));
            expect(Object.keys(actual).sort(), name).toEqual(Object.keys(expected).sort());
            for (const key of Object.keys(expected)) {
                expect(masked(name, key, actual[key]!), `${name} ${key}: ${RESUME_TEXTS}`).toEqual(masked(name, key, expected[key]!));
            }
        }
    });

    it('0026 negative control: one old wording left in a head value is found, and the translation covers every session wording of the Baseline', () => {
        const old = { coach: 'same chat or new chat · fast model', about: ['Same chat or new chat: x. what this chat knows'] };
        expect(translated(old)).toEqual({ coach: 'current or new chat · fast model', about: ['Current or new chat: x. what the current chat knows'] });
        expect(translated(old)).not.toEqual(old);
        const baseline = fs.readdirSync(snapshotFile('x').replace(/x\.json$/, '')).map((file) => fs.readFileSync(snapshotFile(file.replace(/\.json$/, '')), 'utf8')).join('');
        expect(baseline).toMatch(/same chat or new chat/i);
    });

    it('negative control: one snapshot value edited by hand is found', async () => {
        const entry = (await allBaselineNames()).find((candidate) => candidate.name === 'ac004-report-first')!;
        const expected = read(`case-${entry.name}`);
        const key = Object.keys(expected)[0]!;
        const edited = { ...expected[key]!, state: 'Review' };
        const actual = snapshotOf(await modelOfBaseline(entry));
        expect(actual[key]).not.toEqual(edited);
    });

    it('every exception names a spec that differs at the head (no stale exception)', async () => {
        const names = await allBaselineNames();
        for (const exception of EXCEPTIONS) {
            const entry = names.find((candidate) => (candidate.kind === 'case' ? `case-${candidate.name}` : candidate.name) === exception.snapshot)!;
            const actual = snapshotOf(await modelOfBaseline(entry))[exception.key]!;
            const expected = read(exception.snapshot)[exception.key]!;
            expect(exception.fields.some((field) => JSON.stringify(actual[field]) !== JSON.stringify(expected[field])), `${exception.snapshot} ${exception.key}: ${exception.why}`).toBe(true);
        }
    });

    it('every snapshot file belongs to a fixture project or case', async () => {
        const names = new Set((await allBaselineNames()).map((entry) => (entry.kind === 'case' ? `case-${entry.name}` : entry.name)));
        const files = fs.readdirSync(snapshotFile('x').replace(/x\.json$/, '')).map((file) => file.replace(/\.json$/, ''));
        expect([...names].sort()).toEqual(files.sort());
    });
});

