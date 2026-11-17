import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECRET_PATTERNS } from '../../../core/runtime/masking';
import { sampleOf } from '../../../core/runtime/testing/secretSamples';
import { APPROVED_WRITE_FILE, RECORDED_FILE, readFixture, SYNTHETIC_FILE } from './testing/recorded';

const HOME_PATH = /[A-Za-z]:\\+Users|\/home\/|\/Users\/|AppData|~\\|\/root\//;
const POC_FOLDER = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'decisions', 'poc-copilot-2026-11-17');
const POC_REPOSITORY = path.join(POC_FOLDER, 'events-copilot.jsonl');
const POC_APPROVED_WRITE = path.join(POC_FOLDER, 'events-approved-write.jsonl');
const MACHINE_PATH = /[A-Za-z]:(\\|\/)/;

const recorded = readFileSync(RECORDED_FILE, 'utf8');
const synthetic = readFileSync(SYNTHETIC_FILE, 'utf8');
const approvedWrite = readFileSync(APPROVED_WRITE_FILE, 'utf8');

function secretHits(content: string): string[] {
    return SECRET_PATTERNS.filter((pattern) => new RegExp(pattern.source, pattern.flags).test(content)).map((pattern) => pattern.name);
}

describe('Copilot fixtures (spec 0010 §11, BR-02)', () => {
    it('AC-010: no fixture line matches a masking pattern of docs/security/secret-patterns.md', () => {
        expect(secretHits(recorded)).toEqual([]);
        expect(secretHits(synthetic)).toEqual([]);
        expect(secretHits(approvedWrite)).toEqual([]);
    });

    it('AC-010: negative control, every masking pattern finds its own sample', () => {
        for (const pattern of SECRET_PATTERNS) {
            expect(secretHits(sampleOf(pattern.name))).toContain(pattern.name);
        }
    });

    it('AC-010: no fixture holds a home path of the machine that recorded it', () => {
        expect(HOME_PATH.test(recorded)).toBe(false);
        expect(HOME_PATH.test(synthetic)).toBe(false);
        expect(HOME_PATH.test(approvedWrite)).toBe(false);
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

    it('AC-010: the approved-write recording names the scratch folder only as {{root}} and holds no drive path of the recording machine', () => {
        expect(MACHINE_PATH.test(approvedWrite)).toBe(false);
        expect(MACHINE_PATH.test('C:\\\\projects')).toBe(true);
        expect(approvedWrite).toContain('{{root}}');
    });

    it('AC-010: the approved-write recording is the capture unchanged: its sdk and handler lines, byte for byte, in order, with one approved write', () => {
        const original = readFileSync(POC_APPROVED_WRITE, 'utf8')
            .split(/\r?\n/)
            .filter((line) => line !== '' && (JSON.parse(line) as { src: string }).src !== 'capture');
        expect(approvedWrite.split('\n').filter((line) => line !== '')).toEqual(original);
        const rows = readFixture(APPROVED_WRITE_FILE);
        expect(rows.length).toBe(90);
        expect(new Set(rows.map((row) => row.src))).toEqual(new Set(['sdk', 'handler']));
        expect(rows.filter((row) => row.src === 'handler').map((row) => (row as { decision?: string }).decision)).toEqual(['approve-once']);
    });
});

