import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { CopilotElicitationRequest, CopilotEvent, CopilotPermissionRequest, CopilotUserInputRequest } from '../client';

const FIXTURES = path.resolve(__dirname, '..', '..', '..', '..', '..', 'test', 'fixtures', 'copilot');

export const RECORDED_FILE = path.join(FIXTURES, 'recorded-2026-11-17.jsonl');
export const SYNTHETIC_FILE = path.join(FIXTURES, 'synthetic.jsonl');

export interface FixtureRow {
    seq: number;
    ts: string;
    check: string;
    src: string;
    type: string;
    session?: string;
    eventId?: string;
    ephemeral?: boolean;
    synthetic?: boolean;
    summary?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

export type ScriptStep =
    | { kind: 'event'; event: CopilotEvent; afterMs?: number }
    | { kind: 'permission'; request: CopilotPermissionRequest; afterMs?: number }
    | { kind: 'userInput'; request: CopilotUserInputRequest; afterMs?: number }
    | { kind: 'elicitation'; request: CopilotElicitationRequest; afterMs?: number };

export interface Placeholders {
    root: string;
    outside: string;
}

export function readFixture(file: string): FixtureRow[] {
    return readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => JSON.parse(line) as FixtureRow);
}

function keysOnly(keys: unknown): Record<string, unknown> {
    return Object.fromEntries((Array.isArray(keys) ? (keys as string[]) : []).map((key) => [key, null]));
}

function rebuild(row: FixtureRow): Record<string, unknown> {
    if (row.data !== undefined) {
        return row.data;
    }
    const summary = row.summary ?? {};
    if ('keys' in summary && Object.keys(summary).length === 1) {
        return keysOnly(summary.keys);
    }
    if (row.type === 'permission.requested') {
        const { requestId, kind, toolCallId, permissionMode, file } = summary as Record<string, string>;
        return { requestId, permissionMode, permissionRequest: { kind, toolCallId, ...(file === undefined ? {} : { fileName: file }) } };
    }
    if (row.type === 'assistant.reasoning') {
        return { content: 'x'.repeat(Number(summary.length ?? 0)) };
    }
    if (row.type === 'assistant.reasoning_delta') {
        return { deltaContent: 'x'.repeat(Number(summary.length ?? 0)) };
    }
    return { ...summary };
}

function substitute(value: unknown, placeholders: Placeholders): unknown {
    if (typeof value === 'string') {
        return value.replaceAll('{{root}}', placeholders.root).replaceAll('{{outside}}', placeholders.outside);
    }
    if (Array.isArray(value)) {
        return value.map((item) => substitute(item, placeholders));
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, placeholders)]));
    }
    return value;
}

const HANDLER_KINDS: Record<string, ScriptStep['kind']> = {
    'permission.handler': 'permission',
    'user_input.handler': 'userInput',
    'elicitation.handler': 'elicitation',
};

function handlerRequest(row: FixtureRow): Record<string, unknown> {
    if (row.data?.request !== undefined) {
        return row.data.request as Record<string, unknown>;
    }
    const summary = row.summary ?? {};
    return { kind: summary.kind, toolCallId: summary.toolCallId, fileName: summary.detail, intention: summary.intention };
}

export function toSteps(rows: readonly FixtureRow[], placeholders: Placeholders = { root: '/work/project', outside: '/work/other' }): ScriptStep[] {
    const steps: ScriptStep[] = [];
    for (const row of rows) {
        if (row.src === 'sdk') {
            const event: CopilotEvent = { type: row.type, data: substitute(rebuild(row), placeholders) as Record<string, unknown> };
            if (row.eventId !== undefined) {
                event.id = row.eventId;
            }
            event.timestamp = row.ts;
            if (row.ephemeral === true) {
                event.ephemeral = true;
            }
            steps.push({ kind: 'event', event });
        } else if (row.src === 'handler') {
            const kind = HANDLER_KINDS[row.type] ?? 'permission';
            const request = substitute(handlerRequest(row), placeholders);
            steps.push({ kind, request } as ScriptStep);
        }
    }
    return steps;
}

export function recordedRows(check: 'M-02' | 'M-03' | 'M-04' | 'M-05', session?: string): FixtureRow[] {
    return readFixture(RECORDED_FILE).filter((row) => row.check === check && (session === undefined || row.session === session || row.src === 'handler'));
}

export function syntheticRows(...checks: string[]): FixtureRow[] {
    return readFixture(SYNTHETIC_FILE).filter((row) => checks.includes(row.check));
}

export function events(steps: readonly ScriptStep[]): CopilotEvent[] {
    return steps.flatMap((step) => (step.kind === 'event' ? [step.event] : []));
}
