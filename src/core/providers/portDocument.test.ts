import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
    AVAILABILITY_RESULTS,
    AVAILABILITY_TIMEOUT_MS,
    CAPABILITIES,
    CAPABILITY_VALUES,
    ERROR_CATEGORIES,
    EVENT_KINDS,
    KIND_CAPABILITY,
    END_KINDS,
    ERROR_CATEGORY_TEXTS,
    AVAILABILITY_REASONS,
    STOPPED_WITHOUT_END_REASON,
} from './vocabulary';

const DOCUMENT = path.resolve(process.cwd(), 'docs/agent-provider-port.md');

export function tableNames(markdown: string, heading: string): string[] {
    const lines = markdown.split('\n');
    const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
    if (start < 0) {
        return [];
    }
    const names: string[] = [];
    for (const line of lines.slice(start + 1)) {
        if (line.startsWith('## ')) {
            break;
        }
        const cell = /^\|\s*`([^`]+)`/.exec(line);
        if (cell !== null) {
            names.push(cell[1] ?? '');
        }
    }
    return names;
}

function withoutRow(markdown: string, heading: string, name: string): string {
    const lines = markdown.split('\n');
    const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
    const row = lines.findIndex((line, index) => index > start && line.startsWith(`| \`${name}\``));
    return lines.filter((_, index) => index !== row).join('\n');
}

const TABLES: ReadonlyArray<{ heading: string; code: readonly string[] }> = [
    { heading: 'Capabilities', code: CAPABILITIES },
    { heading: 'Event kinds', code: EVENT_KINDS },
    { heading: 'Availability results', code: AVAILABILITY_RESULTS },
    { heading: 'Error categories', code: ERROR_CATEGORIES },
];

function mismatch(markdown: string): string[] {
    const problems: string[] = [];
    for (const { heading, code } of TABLES) {
        const documented = tableNames(markdown, heading);
        for (const name of code.filter((entry) => !documented.includes(entry))) {
            problems.push(`${heading}: code defines ${name}, document does not`);
        }
        for (const name of documented.filter((entry) => !code.includes(entry))) {
            problems.push(`${heading}: document lists ${name}, code does not`);
        }
    }
    return problems;
}

describe('vocabulary', () => {
    it('AC-001: the lists have the sizes the spec fixes', () => {
        expect(CAPABILITIES).toHaveLength(14);
        expect(CAPABILITY_VALUES).toEqual(['native', 'derived', 'none']);
        expect(EVENT_KINDS).toHaveLength(23);
        expect(AVAILABILITY_RESULTS).toHaveLength(5);
        expect(ERROR_CATEGORIES).toHaveLength(9);
        expect(END_KINDS).toEqual(['run.completed', 'run.failed', 'run.cancelled']);
        expect(AVAILABILITY_TIMEOUT_MS).toBe(15_000);
        expect(STOPPED_WITHOUT_END_REASON).toBe('provider stopped without a final event');
    });

    it('AC-001: every kind maps to a capability or none, and every category and non-available result has a text', () => {
        expect(Object.keys(KIND_CAPABILITY).sort()).toEqual([...EVENT_KINDS].sort());
        for (const capability of Object.values(KIND_CAPABILITY)) {
            expect(capability === null || CAPABILITIES.includes(capability)).toBe(true);
        }
        expect(Object.keys(ERROR_CATEGORY_TEXTS).sort()).toEqual([...ERROR_CATEGORIES].sort());
        expect(Object.keys(AVAILABILITY_REASONS).sort()).toEqual(AVAILABILITY_RESULTS.filter((result) => result !== 'available').sort());
    });
});

describe('port document', () => {
    it('AC-001: the document lists every capability, kind, availability result and category, and nothing else', async () => {
        expect(mismatch(await fs.readFile(DOCUMENT, 'utf8'))).toEqual([]);
    });

    it('AC-001: the document describes the operations of the port', async () => {
        const markdown = await fs.readFile(DOCUMENT, 'utf8');
        for (const operation of ['checkAvailability', 'start', 'resume', 'cancel', 'endSession', 'respondToApproval', 'respondToInput', 'listModels', 'nextStartModel']) {
            expect(tableNames(markdown, 'Operations')).toContain(operation);
        }
    });

    it('AC-001: negative control, a document missing a name or listing an extra one fails', async () => {
        const markdown = await fs.readFile(DOCUMENT, 'utf8');
        for (const { heading, code } of TABLES) {
            const first = code[0] ?? '';
            expect(mismatch(withoutRow(markdown, heading, first))).toEqual([`${heading}: code defines ${first}, document does not`]);
        }
        const extra = markdown.replace('## Availability results\n', '## Availability results\n\n| `invented` | x |\n');
        expect(mismatch(extra)).toEqual(['Availability results: document lists invented, code does not']);
    });
});
