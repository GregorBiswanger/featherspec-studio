import type { Diagnostic } from './diagnostics';
import type { FieldValue } from './fieldValue';

export type StepDialect = 'verified-line' | 'covers-line' | 'undetermined';

export interface UnsupportedStepField {
    name: string;
    raw: string;
    line: number;
}

export interface PlanStep {
    id: string;
    title: string;
    line: number;
    struck: boolean;
    dialect: StepDialect;
    ticked: boolean | 'undetermined';
    covers: FieldValue;
    coveredCriteria: string[];
    files: FieldValue;
    doText: FieldValue;
    verify: FieldValue;
    verified: FieldValue;
    notes: FieldValue;
    unsupported: UnsupportedStepField[];
}

export interface PlanStepsResult {
    steps: PlanStep[];
    diagnostics: Diagnostic[];
}

const MAX_RANGE_SPAN = 1000;
const ID_WIDTH = 3;
const PLACEHOLDERS = new Set(['—', '_none_', '_none yet_']);
const HEADING = /^(#{1,6}) /;
const STEP_HEADING = /^### (~~)?\s*(T-\d+)\b\s*(?:[—–-]\s*)?(.*?)\s*(~~)?\s*$/;
const FIELD_LINE = /^- (?:\[( |x|X)\] )?\*\*([^*:]+?):\*\*(?: (.*))?$/;
const RANGE = /AC-(\d+)\s*(?:…|\.\.\.)\s*AC-(\d+)/g;
const SINGLE = /AC-\d+/g;

function classify(raw: string): FieldValue {
    if (raw === '') {
        return { state: 'empty', raw };
    }
    return PLACEHOLDERS.has(raw) ? { state: 'placeholder', raw } : { state: 'value', raw };
}

function formatId(value: number, width: number): string {
    return `AC-${String(value).padStart(Math.max(width, ID_WIDTH), '0')}`;
}

export function expandCovers(raw: string): string[] {
    const found: Array<{ index: number; ids: string[] }> = [];
    const rest = raw.replace(RANGE, (match, from: string, to: string, offset: number) => {
        const start = Number(from);
        const end = Number(to);
        const ids: string[] = [];
        if (start <= end && end - start < MAX_RANGE_SPAN) {
            for (let value = start; value <= end; value += 1) {
                ids.push(formatId(value, from.length));
            }
        } else {
            ids.push(`AC-${from}`, `AC-${to}`);
        }
        found.push({ index: offset, ids });
        return ' '.repeat(match.length);
    });
    for (const match of rest.matchAll(SINGLE)) {
        found.push({ index: match.index, ids: [match[0]] });
    }
    found.sort((a, b) => a.index - b.index);
    return [...new Set(found.flatMap((entry) => entry.ids))];
}

interface RawField {
    name: string;
    box: string | undefined;
    raw: string;
    line: number;
}

function isFence(line: string): boolean {
    const trimmed = line.trimStart();
    return trimmed.startsWith('```') || trimmed.startsWith('~~~');
}

function cleanContinuation(line: string): string {
    return line.replace(/^ {1,2}/, '');
}

function readFields(block: string[], firstLine: number): RawField[] {
    const fields: RawField[] = [];
    let current: { field: RawField; lines: string[] } | undefined;
    const close = (): void => {
        if (current) {
            current.field.raw = current.lines.join('\n').replace(/\s+$/, '');
            fields.push(current.field);
            current = undefined;
        }
    };
    block.forEach((line, offset) => {
        const match = FIELD_LINE.exec(line);
        if (match) {
            close();
            const name = match[2].replace(/\s*\(T-\d+\)$/, '').trim();
            current = {
                field: { name, box: match[1], raw: '', line: firstLine + offset },
                lines: [match[3] ?? ''],
            };
        } else if (current) {
            current.lines.push(cleanContinuation(line));
        }
    });
    close();
    return fields;
}

function buildStep(
    id: string,
    title: string,
    struck: boolean,
    line: number,
    block: string[],
    file: string,
    diagnostics: Diagnostic[],
): PlanStep {
    const fields = readFields(block, line + 1);
    const byName = new Map<string, RawField>();
    const unsupported: UnsupportedStepField[] = [];
    for (const field of fields) {
        if (['Covers', 'Files', 'Do', 'Verify', 'Verified', 'Notes'].includes(field.name)) {
            if (!byName.has(field.name)) {
                byName.set(field.name, field);
            }
        } else {
            unsupported.push({ name: field.name, raw: field.raw, line: field.line });
            diagnostics.push({
                kind: 'unknown-content',
                tier: 'note',
                scope: { file, line: field.line },
                reason: `Step ${id} has an unknown field "${field.name}"`,
            });
        }
    }
    const value = (name: string): FieldValue => {
        const field = byName.get(name);
        return field ? classify(field.raw) : { state: 'absent' };
    };
    const onCovers = byName.get('Covers')?.box;
    const onVerified = byName.get('Verified')?.box;
    let dialect: StepDialect = 'undetermined';
    let ticked: boolean | 'undetermined' = 'undetermined';
    if (onVerified !== undefined && onCovers === undefined) {
        dialect = 'verified-line';
        ticked = onVerified !== ' ';
    } else if (onCovers !== undefined && onVerified === undefined) {
        dialect = 'covers-line';
        ticked = onCovers !== ' ';
    } else {
        const problem =
            onCovers === undefined
                ? 'carries no checkbox on its Covers or Verified line'
                : 'carries a checkbox on both its Covers and its Verified line';
        diagnostics.push({
            kind: 'unknown-content',
            tier: 'note',
            scope: { file, line },
            reason: `Step ${id} ${problem}; dialect and ticked state are undetermined`,
        });
    }
    const covers = value('Covers');
    return {
        id,
        title,
        line,
        struck,
        dialect,
        ticked,
        covers,
        coveredCriteria: covers.state === 'absent' ? [] : expandCovers(covers.raw),
        files: value('Files'),
        doText: value('Do'),
        verify: value('Verify'),
        verified: value('Verified'),
        notes: value('Notes'),
        unsupported,
    };
}

export function parsePlanSteps(text: string, file: string): PlanStepsResult {
    const lines = text.split('\n');
    const steps: PlanStep[] = [];
    const diagnostics: Diagnostic[] = [];
    let open: { id: string; title: string; struck: boolean; line: number; block: string[] } | undefined;
    let inFence = false;
    const close = (): void => {
        if (open) {
            steps.push(buildStep(open.id, open.title, open.struck, open.line, open.block, file, diagnostics));
            open = undefined;
        }
    };
    lines.forEach((line, index) => {
        if (isFence(line)) {
            inFence = !inFence;
        }
        const heading = inFence ? undefined : HEADING.exec(line);
        if (heading && heading[1].length <= 3) {
            close();
            const step = heading[1].length === 3 ? STEP_HEADING.exec(line) : null;
            if (step) {
                const title = step[3].replace(/~~\s*$/, '').trim();
                open = { id: step[2], title, struck: step[1] !== undefined, line: index + 1, block: [] };
            }
        } else if (open) {
            open.block.push(line);
        }
    });
    close();
    const seen = new Map<string, PlanStep[]>();
    for (const step of steps) {
        seen.set(step.id, [...(seen.get(step.id) ?? []), step]);
    }
    for (const step of steps) {
        const same = seen.get(step.id) ?? [];
        if (same.length > 1) {
            const others = same.filter((other) => other !== step).map((other) => `line ${other.line}`);
            diagnostics.push({
                kind: 'duplicate',
                tier: 'note',
                scope: { file, line: step.line },
                reason: `Step ${step.id} occurs more than once in this plan (also at ${others.join(', ')})`,
            });
        }
    }
    return { steps, diagnostics };
}
