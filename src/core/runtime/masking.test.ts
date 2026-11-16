import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { MASK_PLACEHOLDER, SECRET_PATTERNS, createMasker } from './masking';

interface DocRow {
    name: string;
    category: string;
    source: string;
    flags: string;
    sample: string;
}

function readDocRows(): DocRow[] {
    const text = readFileSync(path.resolve(process.cwd(), 'docs/security/secret-patterns.md'), 'utf8');
    const rows: DocRow[] = [];
    for (const line of text.split('\n')) {
        const cells = line.split('|').map((cell) => cell.trim());
        if (cells.length < 7 || !cells[1]?.startsWith('`')) {
            continue;
        }
        const unquote = (cell: string | undefined): string => (cell ?? '').replace(/^`+|`+$/g, '');
        rows.push({
            name: unquote(cells[1]),
            category: unquote(cells[2]),
            source: unquote(cells[3]),
            flags: unquote(cells[4]),
            sample: unquote(cells[5]),
        });
    }
    return rows;
}

describe('secret patterns', () => {
    it('AC-013: docs/security/secret-patterns.md and the code list the same patterns, flags and samples', () => {
        const fromDoc = readDocRows();
        const fromCode = SECRET_PATTERNS.map((pattern) => ({
            name: pattern.name,
            category: pattern.category,
            source: pattern.source,
            flags: pattern.flags,
            sample: pattern.sample,
        }));
        expect(fromDoc).toEqual(fromCode);
    });

    it('AC-013: the list has provider tokens, bearer tokens and private-key blocks, one sample each', () => {
        const categories = new Set(SECRET_PATTERNS.map((pattern) => pattern.category));
        expect(categories).toEqual(new Set(['provider-token', 'bearer-token', 'private-key']));
        const masker = createMasker({ values: () => [] });
        for (const pattern of SECRET_PATTERNS) {
            expect(masker.text(`before ${pattern.sample} after`), pattern.name).toBe(`before ${MASK_PLACEHOLDER} after`);
        }
    });

    it('AC-013: negative control, ordinary text and short look-alikes stay unchanged', () => {
        const masker = createMasker({ values: () => [] });
        const ordinary = 'The task sk-8 is done; Bearer of news; ghp_short; -----BEGIN CERTIFICATE-----';
        expect(masker.text(ordinary)).toBe(ordinary);
    });

    it('AC-013: credential values are masked wherever they occur, empty values are ignored', () => {
        const masker = createMasker({ values: () => ['hunter2-credential', ''] });
        expect(masker.text('a hunter2-credential b hunter2-credential')).toBe(`a ${MASK_PLACEHOLDER} b ${MASK_PLACEHOLDER}`);
        expect(masker.json({ list: ['x hunter2-credential', 3, null, { deep: 'hunter2-credential' }], flag: true })).toEqual({
            list: [`x ${MASK_PLACEHOLDER}`, 3, null, { deep: MASK_PLACEHOLDER }],
            flag: true,
        });
    });
});
