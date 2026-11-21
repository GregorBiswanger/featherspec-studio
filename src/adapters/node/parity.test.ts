import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { readProject } from '../../core/specs/readProject';
import { createNodeSpecSource } from './nodeSpecSource';
import { buildRows, checkRows, chooseOccurrences, collectCriteria, readPdIds, renderMarkdown } from './parity';
import type { Criterion, ParityFailureKind, ParityRow, ParitySource } from './parity';

const root = path.resolve(__dirname, '..', '..', '..');
const source = JSON.parse(readFileSync(path.join(root, 'docs/jetbrains/parity-source.json'), 'utf8')) as ParitySource;
const pdIds = readPdIds(readFileSync(path.join(root, 'docs/product/product-decisions.md'), 'utf8'));
const matrixPath = path.join(root, 'docs/jetbrains/parity.md');
let criteria: Criterion[] = [];
let rows: ParityRow[] = [];

beforeAll(async () => {
    criteria = collectCriteria(await readProject(createNodeSpecSource(), root, '1.10.0'));
    rows = buildRows(criteria, source);
});

function keyOf(entry: { spec: string; id: string }): string {
    return `${entry.spec} ${entry.id}`;
}

describe('0034 T-010: the parity matrix of this repository', () => {
    it('AC-001: one row per criterion of the done and active specs, 0034 excepted', () => {
        expect(criteria.some((entry) => entry.spec === '0034')).toBe(false);
        expect(rows.map(keyOf)).toEqual(criteria.map(keyOf));
    });

    it('AC-001: reads the PD ids of the register', () => {
        expect(pdIds).toContain('PD-001');
        expect(pdIds).toContain('PD-098');
    });

    it('AC-001: docs/jetbrains/parity.md equals the generated matrix (FEATHERSPEC_WRITE_PARITY=1 writes it first)', async () => {
        if (process.env.FEATHERSPEC_WRITE_PARITY === '1') {
            await fs.writeFile(matrixPath, renderMarkdown(rows));
        }
        expect(await fs.readFile(matrixPath, 'utf8')).toBe(renderMarkdown(rows));
    });

    it('AC-002: rendering the matrix twice gives byte-identical text', () => {
        expect(renderMarkdown(buildRows(criteria, source))).toBe(renderMarkdown(rows));
    });

    it('AC-002: no failure for a spec that is not pending', () => {
        const failures = checkRows(rows, criteria, pdIds);
        expect(failures.filter((failure) => !source.pending.includes(failure.row.spec))).toEqual([]);
    });

    for (const spec of source.pending) {
        it.todo(`AC-002: the criteria of spec ${spec} are categorised (pending, T-011)`);
    }

    it('AC-003: every criterion of 0008-0012 is n-a with its successor named', () => {
        const deprecated = rows.filter((row) => ['0008', '0009', '0010', '0011', '0012'].includes(row.spec));
        expect(deprecated.length).toBeGreaterThan(0);
        for (const row of deprecated) {
            expect(row.category, keyOf(row)).toBe('n-a');
            expect(row.reference, keyOf(row)).toContain('successor 0015');
        }
    });
});

const syntheticCriteria: Criterion[] = [
    { spec: '0001', id: 'AC-001', struck: false },
    { spec: '0001', id: 'AC-002', struck: false },
    { spec: '0001', id: 'AC-003', struck: false },
    { spec: '0009', id: 'AC-001', struck: true },
];

const syntheticSource: ParitySource = {
    pending: [],
    specs: {
        '0001': {
            criteria: {
                'AC-001': { category: 'shared', reference: 'C-read' },
                'AC-002': { category: 'host', reference: 'H-3 and 0034 AC-010' },
                'AC-003': { category: 'deliberately different', reference: 'PD-099' },
            },
        },
        '0009': { default: { category: 'n-a', reference: 'Deprecated, successor 0015' } },
    },
};

const syntheticPdIds = ['PD-099'];

describe('0034 T-010: the check fails for every failure kind (AC-002 negative controls)', () => {
    const base = buildRows(syntheticCriteria, syntheticSource);
    const [shared, host, deliberate, struck] = base;

    function kindsOf(candidate: ParityRow[]): ParityFailureKind[] {
        return checkRows(candidate, syntheticCriteria, syntheticPdIds).map((failure) => failure.kind);
    }

    it('the valid synthetic matrix passes', () => {
        expect(kindsOf(base)).toEqual([]);
    });

    const controls: [ParityFailureKind, ParityRow[], ParityFailureKind[]][] = [
        ['missing', base.slice(1), ['missing']],
        ['duplicate', [...base, shared], ['duplicate', 'duplicate']],
        ['no-category', [{ ...shared, category: undefined }, host, deliberate, struck], ['no-category']],
        ['unknown-category', [{ ...shared, category: 'maybe' }, host, deliberate, struck], ['unknown-category']],
        ['no-reference', [{ ...shared, reference: undefined }, host, deliberate, struck], ['no-reference']],
        ['unknown-criterion', [...base, { spec: '0001', id: 'AC-999', category: 'shared', reference: 'C-read' }], ['unknown-criterion']],
        ['bad-pd', [shared, host, { ...deliberate, reference: 'PD-404' }, struck], ['bad-pd']],
        ['struck-not-na', [shared, host, deliberate, { ...struck, category: 'shared', reference: 'C-read' }], ['struck-not-na']],
    ];

    for (const [kind, candidate, expected] of controls) {
        it(`AC-002: a ${kind} row is reported as ${kind}`, () => {
            expect(kindsOf(candidate)).toEqual(expected);
        });
    }
});

describe('0034 T-010: one occurrence per criterion (AC-002)', () => {
    const note = { id: 'AC-025', text: '- AC-025 fails with an assistant on the build (V-1 passed with Claude Code, PD-072)', struck: false };
    const bold = { id: 'AC-025', text: '- **AC-025** *(manual, Gregor, with GitHub Copilot and with Claude Code; PD-072)* On `tip-splitter`', struck: false };

    it('AC-002: 0021 AC-025 keeps the bold criterion when a note bullet comes first', () => {
        expect(chooseOccurrences([note, bold])).toEqual([bold]);
    });

    it('AC-002: without a bold occurrence the first occurrence is kept', () => {
        const first = { ...note, text: '- AC-001 cannot run in an extension-host test' };
        const second = { ...note, text: '- AC-001…AC-025 pass in plain Node' };
        expect(chooseOccurrences([first, second])).toEqual([first]);
    });

    it('AC-002: the kept criteria keep their file order', () => {
        const other = { id: 'AC-010', text: '- **AC-010** The system shall', struck: false };
        expect(chooseOccurrences([bold, other, note]).map((entry) => entry.id)).toEqual(['AC-025', 'AC-010']);
    });

    it('AC-002: negative control, one criterion ID named by two rules is a duplicate', () => {
        const criteria: Criterion[] = [{ spec: '0001', id: 'AC-001', struck: false }];
        const overlapping: ParitySource = {
            pending: [],
            specs: { '0001': { criteria: { 'AC-001': { category: 'shared', reference: 'C-read' } }, ranges: { 'AC-001..AC-002': { category: 'shared', reference: 'C-read' } } } },
        };
        expect(checkRows(buildRows(criteria, overlapping), criteria, []).map((failure) => failure.kind)).toEqual(['duplicate', 'duplicate']);
    });
});

describe('0034 T-010: the rendered matrix', () => {
    it('AC-002: renders one table with the spec, criterion, category and reference of each row', () => {
        const text = renderMarkdown([{ spec: '0001', id: 'AC-001', category: 'shared', reference: 'C-read' }]);
        expect(text).toContain('| 0001 | AC-001 | shared | C-read |');
        expect(text.endsWith('\n')).toBe(true);
    });
});
