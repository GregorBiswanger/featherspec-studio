import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECRET_PATTERNS } from '../../../core/runtime/masking';
import { sampleOf } from '../../../core/runtime/testing/secretSamples';
import { RECORDED_FILE, readFixture, SYNTHETIC_FILE } from './testing/recorded';

const HOME_PATH = /[A-Za-z]:\\+Users|\/home\/|\/Users\/|AppData|~\\|\/root\//;
const POC_REPOSITORY = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'decisions', 'poc-copilot-2026-11-17', 'events-copilot.jsonl');

const recorded = readFileSync(RECORDED_FILE, 'utf8');
const synthetic = readFileSync(SYNTHETIC_FILE, 'utf8');

function secretHits(content: string): string[] {
    return SECRET_PATTERNS.filter((pattern) => new RegExp(pattern.source, pattern.flags).test(content)).map((pattern) => pattern.name);
}

describe('Copilot fixtures (spec 0010 §11, BR-02)', () => {
    it('AC-010: no fixture line matches a masking pattern of docs/security/secret-patterns.md', () => {
        expect(secretHits(recorded)).toEqual([]);
        expect(secretHits(synthetic)).toEqual([]);
    });

    it('AC-010: negative control, every masking pattern finds its own sample', () => {
        for (const pattern of SECRET_PATTERNS) {
            expect(secretHits(sampleOf(pattern.name))).toContain(pattern.name);
        }
    });

    it('AC-010: no fixture holds a home path of the machine that recorded it', () => {
        expect(HOME_PATH.test(recorded)).toBe(false);
        expect(HOME_PATH.test(synthetic)).toBe(false);
        expect(HOME_PATH.test('C:\\Users\\someone\\x')).toBe(true);
    });

    it('AC-010: the recording holds only SDK and handler lines, none of the PoC script itself', () => {
        const rows = readFixture(RECORDED_FILE);
        expect(rows.length).toBe(285);
        expect(new Set(rows.map((row) => row.src))).toEqual(new Set(['sdk', 'handler']));
        expect(rows.some((row) => row.type.startsWith('poc.'))).toBe(false);
        expect(rows.some((row) => row.synthetic === true)).toBe(false);
    });

    it('AC-010: the recording is the PoC evidence unchanged: its sdk and handler lines, byte for byte, in order', () => {
        const original = readFileSync(POC_REPOSITORY, 'utf8')
            .split(/\r?\n/)
            .filter((line) => line !== '' && (JSON.parse(line) as { src: string }).src !== 'poc');
        expect(recorded.split('\n').filter((line) => line !== '')).toEqual(original);
    });

    it('AC-010: every line of the hand-written stream is marked synthetic and carries full data, none of the recording is', () => {
        const rows = readFixture(SYNTHETIC_FILE);
        expect(rows.length).toBeGreaterThan(20);
        expect(rows.every((row) => row.synthetic === true && row.data !== undefined)).toBe(true);
    });

    it('AC-010: the synthetic stream covers the types the recording lacks', () => {
        const types = new Set(readFixture(SYNTHETIC_FILE).map((row) => row.type));
        for (const type of [
            'tool.execution_progress',
            'tool.execution_complete',
            'user_input.requested',
            'user_input.completed',
            'elicitation.requested',
            'elicitation.completed',
            'session.todos_changed',
            'session.warning',
            'session.error',
            'future.thing',
        ]) {
            expect(types).toContain(type);
        }
        const edits = readFixture(SYNTHETIC_FILE).flatMap((row) => ((row.data?.fileEdits ?? []) as { kind: string }[]).map((edit) => edit.kind));
        expect(new Set(edits)).toEqual(new Set(['create', 'edit', 'delete', 'rename']));
    });
});
