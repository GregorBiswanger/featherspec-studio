import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '../discovery/testing/fixtures';
import { expandCovers, parsePlanSteps } from './planSteps';
import { normalizeText } from './text';

const FILE = '.specs/active/0001-x.plan.md';

async function fixtureText(...segments: string[]): Promise<string> {
    const bytes = await fs.readFile(path.join(fixturePath(segments[0]), ...segments.slice(1)), 'utf8');
    return normalizeText(bytes);
}

describe('expandCovers', () => {
    it('AC-008: a range AC-a … AC-b with a <= b returns every ID from a to b and keeps the width', () => {
        expect(expandCovers('AC-003 … AC-006')).toEqual(['AC-003', 'AC-004', 'AC-005', 'AC-006']);
    });

    it('AC-008: a range with three dots or no spaces is expanded too', () => {
        expect(expandCovers('AC-001 ... AC-003')).toEqual(['AC-001', 'AC-002', 'AC-003']);
        expect(expandCovers('AC-001…AC-002')).toEqual(['AC-001', 'AC-002']);
    });

    it('AC-008: a one-element range returns that ID once', () => {
        expect(expandCovers('AC-004 … AC-004')).toEqual(['AC-004']);
    });

    it('AC-008: a reversed range returns only the IDs written', () => {
        expect(expandCovers('AC-006 … AC-003')).toEqual(['AC-006', 'AC-003']);
    });

    it('AC-008: another delimiter returns only the IDs written', () => {
        expect(expandCovers('AC-003 to AC-005')).toEqual(['AC-003', 'AC-005']);
        expect(expandCovers('AC-003 – AC-005')).toEqual(['AC-003', 'AC-005']);
    });

    it('AC-008: a list with prose returns exactly the IDs written', () => {
        expect(expandCovers('AC-008, AC-009, AC-019, AC-012 (the `amount` share of it)')).toEqual([
            'AC-008',
            'AC-009',
            'AC-019',
            'AC-012',
        ]);
    });

    it('AC-008: prose without an ID returns nothing', () => {
        expect(expandCovers('scaffolding only — no acceptance criterion')).toEqual([]);
    });

    it('AC-008: a range mixed with a list expands the range and keeps the single IDs, each once', () => {
        expect(expandCovers('AC-001, AC-003 … AC-005, AC-003')).toEqual(['AC-001', 'AC-003', 'AC-004', 'AC-005']);
    });

    it('AC-008: an absurdly wide range is not expanded', () => {
        expect(expandCovers('AC-001 … AC-999999999')).toEqual(['AC-001', 'AC-999999999']);
    });
});

describe('parsePlanSteps', () => {
    it('AC-007: reads the five steps of the 1.10 plan (TS110) in the Verified-line dialect', async () => {
        const text = await fixtureText('fs110-de-active-review', '.specs', 'active', '0001-tip-splitter.plan.md');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps.map((step) => step.id)).toEqual(['T-001', 'T-002', 'T-003', 'T-004', 'T-005']);
        expect(steps.every((step) => step.dialect === 'verified-line')).toBe(true);
        expect(steps.every((step) => step.ticked === true)).toBe(true);
        expect(steps[0].title).toBe('Toolchain einrichten und Rechnung centgenau aufteilen');
        expect(steps[0].coveredCriteria).toEqual(['AC-002', 'AC-003', 'AC-004', 'AC-007', 'AC-008']);
        expect(steps[0].covers).toEqual({ state: 'value', raw: 'AC-002, AC-003, AC-004, AC-007, AC-008' });
        expect(steps[0].files).toEqual({ state: 'absent' });
        expect(steps[2].verify.state).toBe('value');
        expect(steps[2].verified.state).toBe('value');
        expect(steps[2].notes).toEqual({ state: 'placeholder', raw: '—' });
        expect(steps[0].line).toBe(75);
        expect(diagnostics).toEqual([]);
    });

    it('AC-007: reads the nine steps of the archived 1.8 plan (TS180) in the Covers-line dialect', async () => {
        const text = await fixtureText(
            'fs180-en-done-archived',
            '.specs',
            'plan-archive',
            '0001-split-bill-with-tip.2026-09-19.plan.md',
        );
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps).toHaveLength(9);
        expect(steps.every((step) => step.dialect === 'covers-line' && step.ticked === true)).toBe(true);
        expect(steps[0].coveredCriteria).toEqual([]);
        expect(steps[0].covers.state).toBe('value');
        expect(steps[0].verified.state).toBe('value');
        expect(steps[5].coveredCriteria).toEqual(['AC-008', 'AC-009', 'AC-019', 'AC-012']);
        expect(diagnostics).toEqual([]);
    });

    it('AC-008: the range in the last TS180 step expands to AC-001 … AC-020 and keeps the raw text', async () => {
        const text = await fixtureText(
            'fs180-en-done-archived',
            '.specs',
            'plan-archive',
            '0001-split-bill-with-tip.2026-09-19.plan.md',
        );
        const last = parsePlanSteps(text, FILE).steps[8];
        expect(last.covers).toEqual({ state: 'value', raw: 're-proves AC-001 … AC-020' });
        expect(last.coveredCriteria).toHaveLength(20);
        expect(last.coveredCriteria[0]).toBe('AC-001');
        expect(last.coveredCriteria[19]).toBe('AC-020');
    });

    it('AC-007: reads the four steps of the 1.7 plan (LS170) in the Covers-line dialect', async () => {
        const text = await fixtureText('fs170-brownfield-mixed', '.specs', 'active', '0006-outbox-batch-size.plan.md');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps.map((step) => step.id)).toEqual(['T-001', 'T-002', 'T-003', 'T-004']);
        expect(steps.every((step) => step.dialect === 'covers-line')).toBe(true);
        expect(steps[3].coveredCriteria).toEqual(['AC-001', 'AC-002', 'AC-003']);
        expect(diagnostics).toEqual([]);
    });

    it('AC-007: an unticked box on the Verified line gives ticked false and a placeholder Verified', () => {
        const text = [
            '### T-001 — First',
            '',
            '- **Covers:** AC-001',
            '- **Do:** x',
            '- **Verify:** `npm test`',
            '- [ ] **Verified (T-001):** —',
            '- **Notes:** —',
        ].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps[0].dialect).toBe('verified-line');
        expect(steps[0].ticked).toBe(false);
        expect(steps[0].verified).toEqual({ state: 'placeholder', raw: '—' });
        expect(diagnostics).toEqual([]);
    });

    it('AC-007: an unticked box on the Covers line gives the Covers dialect with ticked false', () => {
        const text = ['### T-001 — First', '', '- [ ] **Covers:** AC-001', '- **Verified:** —'].join('\n');
        const step = parsePlanSteps(text, FILE).steps[0];
        expect(step.dialect).toBe('covers-line');
        expect(step.ticked).toBe(false);
    });

    it('AC-007: a step without any checkbox is undetermined, with a diagnostic', () => {
        const text = ['### T-001 — First', '', '- **Covers:** AC-001', '- **Verified:** —'].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps[0].dialect).toBe('undetermined');
        expect(steps[0].ticked).toBe('undetermined');
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ kind: 'unknown-content', scope: { file: FILE, line: 1 } });
        expect(diagnostics[0].reason).toContain('T-001');
    });

    it('AC-007: a checkbox on both lines is undetermined, with a diagnostic', () => {
        const text = ['### T-002 — Both', '', '- [x] **Covers:** AC-001', '- [ ] **Verified (T-002):** —'].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps[0].dialect).toBe('undetermined');
        expect(steps[0].ticked).toBe('undetermined');
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].kind).toBe('unknown-content');
    });

    it('AC-007: a multi-line field keeps its continuation lines, a capital X ticks', () => {
        const text = [
            '### T-001 — First',
            '',
            '- **Covers:** AC-001,',
            '  AC-002',
            '- **Do:** line one',
            '  line two',
            '',
            '  line three',
            '- [X] **Verified (T-001):** done',
            '  more',
        ].join('\n');
        const step = parsePlanSteps(text, FILE).steps[0];
        expect(step.ticked).toBe(true);
        expect(step.covers).toEqual({ state: 'value', raw: 'AC-001,\nAC-002' });
        expect(step.coveredCriteria).toEqual(['AC-001', 'AC-002']);
        expect(step.doText).toEqual({ state: 'value', raw: 'line one\nline two\n\nline three' });
        expect(step.verified).toEqual({ state: 'value', raw: 'done\nmore' });
    });

    it('AC-019: a field with nothing after it is empty, a missing one is absent', () => {
        const text = ['### T-001 — First', '', '- [ ] **Verified (T-001):** —', '- **Notes:**'].join('\n');
        const step = parsePlanSteps(text, FILE).steps[0];
        expect(step.notes).toEqual({ state: 'empty', raw: '' });
        expect(step.covers).toEqual({ state: 'absent' });
        expect(step.doText).toEqual({ state: 'absent' });
    });

    it('AC-015: Files is read where present', () => {
        const text = [
            '### T-002 — Parallel',
            '',
            '- **Covers:** AC-001',
            '- **Files:** `src/a.ts`, `src/a.test.ts`',
            '- [ ] **Verified (T-002):** —',
        ].join('\n');
        expect(parsePlanSteps(text, FILE).steps[0].files).toEqual({
            state: 'value',
            raw: '`src/a.ts`, `src/a.test.ts`',
        });
    });

    it('AC-014: an unknown step field is kept as unsupported content with a diagnostic', () => {
        const text = [
            '### T-001 — First',
            '',
            '- **Owner:** Gregor',
            '  and more',
            '- [ ] **Verified (T-001):** —',
        ].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps[0].unsupported).toEqual([{ name: 'Owner', raw: 'Gregor\nand more', line: 3 }]);
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ kind: 'unknown-content', scope: { file: FILE, line: 3 } });
        expect(diagnostics[0].reason).toContain('Owner');
    });

    it('AC-007: a struck step is returned with its struck state and the title without the marks', () => {
        const text = ['### ~~T-003 — Obsolete~~', '', '- [ ] **Verified (T-003):** —'].join('\n');
        const step = parsePlanSteps(text, FILE).steps[0];
        expect(step.id).toBe('T-003');
        expect(step.struck).toBe(true);
        expect(step.title).toBe('Obsolete');
    });

    it('AC-015: a T-NNN twice in one plan keeps every occurrence with a duplicate diagnostic each', () => {
        const text = [
            '### T-001 — First',
            '- [ ] **Verified (T-001):** —',
            '',
            '### T-002 — Second',
            '- [ ] **Verified (T-002):** —',
            '',
            '### T-001 — First again',
            '- [ ] **Verified (T-001):** —',
        ].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps.map((step) => step.title)).toEqual(['First', 'Second', 'First again']);
        const duplicates = diagnostics.filter((diagnostic) => diagnostic.kind === 'duplicate');
        expect(duplicates.map((diagnostic) => diagnostic.scope)).toEqual([
            { file: FILE, line: 1 },
            { file: FILE, line: 7 },
        ]);
        expect(duplicates[0].reason).toContain('T-001');
    });

    it('AC-007: the step ends at the next level-2 heading, the traceability table is not step content', () => {
        const text = [
            '### T-001 — First',
            '- [x] **Verified (T-001):** ok',
            '- **Notes:** —',
            '',
            '## Traceability',
            '',
            '- **Owner:** nobody',
        ].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps[0].unsupported).toEqual([]);
        expect(diagnostics).toEqual([]);
    });

    it('AC-007: other level-3 headings are not steps and end the step', () => {
        const text = ['### T-001 — First', '- [x] **Verified (T-001):** ok', '### Notes', '- **Owner:** x'].join('\n');
        const { steps, diagnostics } = parsePlanSteps(text, FILE);
        expect(steps).toHaveLength(1);
        expect(steps[0].unsupported).toEqual([]);
        expect(diagnostics).toEqual([]);
    });

    it('AC-007: a plan without steps returns none', () => {
        expect(parsePlanSteps('# Plan\n\n## Steps\n', FILE)).toEqual({ steps: [], diagnostics: [] });
    });

    it('AC-007: headings inside a code fence are not steps', () => {
        const text = [
            '### T-001 — First',
            '- **Do:** example',
            '',
            '  ```',
            '### T-009 — fake',
            '  ```',
            '- [x] **Verified (T-001):** ok',
        ].join('\n');
        expect(parsePlanSteps(text, FILE).steps.map((step) => step.id)).toEqual(['T-001']);
    });
});
