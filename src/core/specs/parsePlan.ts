import type { Diagnostic } from './diagnostics';
import type { FieldValue } from './fieldValue';
import type { HeaderField } from './parseSpec';
import { parsePlanSteps, type PlanStep } from './planSteps';

export type PlanContentPlace = 'header' | 'section' | 'stages' | 'traceability' | 'handoff';

export interface UnsupportedPlanContent {
    place: PlanContentPlace;
    label: string;
    raw: string;
    line: number;
}

export type StageKind = 'single' | 'sequential' | 'parallel' | 'mixed';

export interface PlanStage {
    number: number;
    raw: string;
    line: number;
    stepIds: string[];
    kind: StageKind;
}

export interface StagesClosing {
    raw: string;
    line: number;
    parallel: boolean;
}

export interface PlanStages {
    present: boolean;
    stages: PlanStage[];
    closing: StagesClosing | undefined;
}

export interface TraceabilityRow {
    criterion: string;
    steps: FieldValue;
    code: FieldValue;
    test: FieldValue;
    manual: boolean;
    state: string;
    stateKnown: boolean;
    line: number;
}

export interface PlanHandoff {
    doneSoFar: HeaderField;
    nextAction: HeaderField;
    openDecisions: HeaderField;
    baseline: HeaderField;
    environment: HeaderField;
}

export interface ParsedPlan {
    title: HeaderField;
    spec: HeaderField;
    status: HeaderField;
    lastUpdated: HeaderField;
    currentStep: HeaderField;
    stages: PlanStages;
    steps: PlanStep[];
    traceability: TraceabilityRow[];
    handoff: PlanHandoff;
    unsupported: UnsupportedPlanContent[];
    diagnostics: Diagnostic[];
}

const KNOWN_STATUS = new Set(['Not started', 'In Progress', 'Blocked', 'Done']);
const KNOWN_SECTIONS = new Set(['Approach', 'Research', 'Stages', 'Steps', 'Traceability', 'Session handoff']);
const KNOWN_STATES = new Set(['open', 'built', 'verified']);
const PLACEHOLDERS = new Set(['—', '_none_', '_none yet_']);
const SKELETON_PLACEHOLDER = /^_\([^\n]*\)_$/;
const TRACEABILITY_COLUMNS = ['Acceptance criterion', 'Steps', 'Code / files', 'Test', 'State'];
const HEADER_LINE = /^\*\*([^*\n]+?):\*\*[ \t]*(.*?)[ \t]*$/;
const HANDOFF_LINE = /^(?:- )?\*\*([^*\n]+?):\*\*(?:[ \t]+(.*?))?[ \t]*$/;
const H1 = /^#(?:[ \t]+(.*?))?[ \t]*$/;
const H2 = /^##(?:[ \t]+(.*?))?[ \t]*$/;
const STEP_HEADING = /^### (?:~~)?\s*T-\d+\b/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const STAGE_LINE = /^(\d+)\.[ \t]+(.*?)[ \t]*$/;
const CLOSING_LINE = /^(Parallel|No parallel stage):/;
const STAGE_DELIMITER = /\s[—–-]\s/;
const SEPARATOR_CELL = /^:?-+:?$/;

type HeaderLabel = 'Spec' | 'Status' | 'Last updated' | 'Current step';
type HandoffLabel = 'Done so far' | 'Next action' | 'Open decisions' | 'Baseline' | 'Environment';
type HandoffKey = keyof PlanHandoff;

const HANDOFF_KEYS: Record<HandoffLabel, HandoffKey> = {
    'Done so far': 'doneSoFar',
    'Next action': 'nextAction',
    'Open decisions': 'openDecisions',
    Baseline: 'baseline',
    Environment: 'environment',
};

function classify(raw: string): FieldValue {
    if (raw === '') {
        return { state: 'empty', raw };
    }
    return { state: PLACEHOLDERS.has(raw) || SKELETON_PLACEHOLDER.test(raw) ? 'placeholder' : 'value', raw };
}

function fencedLines(lines: readonly string[]): boolean[] {
    const fenced: boolean[] = [];
    let open: { char: string; length: number } | undefined;
    for (const line of lines) {
        const match = FENCE.exec(line);
        if (open === undefined) {
            fenced.push(match !== null);
            if (match !== null) {
                open = { char: match[1][0], length: match[1].length };
            }
        } else {
            fenced.push(true);
            if (match !== null && match[1][0] === open.char && match[1].length >= open.length && line.trim() === match[1]) {
                open = undefined;
            }
        }
    }
    return fenced;
}

function trimEndLines(lines: readonly string[]): string {
    return lines.join('\n').replace(/\s+$/, '');
}

function splitRow(line: string): string[] {
    const body = line.trim().replace(/^\|/, '');
    const cells: string[] = [];
    let current = '';
    let inCode = false;
    let endedOnSeparator = false;
    for (let index = 0; index < body.length; index += 1) {
        const char = body[index];
        endedOnSeparator = false;
        if (char === '\\' && body[index + 1] === '|') {
            current += '|';
            index += 1;
        } else if (char === '`') {
            inCode = !inCode;
            current += char;
        } else if (char === '|' && !inCode) {
            cells.push(current.trim());
            current = '';
            endedOnSeparator = true;
        } else {
            current += char;
        }
    }
    if (!(endedOnSeparator && current.trim() === '')) {
        cells.push(current.trim());
    }
    return cells;
}

interface Context {
    file: string;
    lines: readonly string[];
    fenced: readonly boolean[];
    unsupported: UnsupportedPlanContent[];
    diagnostics: Diagnostic[];
}

function addUnsupported(context: Context, item: UnsupportedPlanContent, reason: string): void {
    context.unsupported.push(item);
    context.diagnostics.push({ kind: 'unknown-content', scope: { file: context.file, line: item.line }, reason });
}

function readHeader(context: Context, end: number): Record<HeaderLabel, HeaderField> & { title: HeaderField } {
    const found: Record<HeaderLabel, HeaderField> & { title: HeaderField } = {
        title: { value: { state: 'absent' } },
        Spec: { value: { state: 'absent' } },
        Status: { value: { state: 'absent' } },
        'Last updated': { value: { state: 'absent' } },
        'Current step': { value: { state: 'absent' } },
    };
    let titleSeen = false;
    let open: { label: string; lines: string[]; line: number } | undefined;
    let loose: UnsupportedPlanContent | undefined;
    const close = (): void => {
        if (open === undefined) {
            return;
        }
        const raw = trimEndLines(open.lines);
        const label = open.label;
        const line = open.line;
        open = undefined;
        const known = label === 'Spec' || label === 'Status' || label === 'Last updated' || label === 'Current step';
        if (known && found[label].line === undefined) {
            found[label] = { value: classify(raw), line };
            if (label === 'Status' && raw !== '' && !KNOWN_STATUS.has(raw)) {
                context.diagnostics.push({
                    kind: 'unknown-content',
                    scope: { file: context.file, line },
                    reason: `Unknown plan status "${raw}"; documented values are Not started, In Progress, Blocked, Done`,
                });
            }
        } else {
            addUnsupported(
                context,
                { place: 'header', label, raw, line },
                known ? `Plan header line "${label}" occurs more than once; the first one is used` : `Unknown plan header line "${label}"`,
            );
        }
    };
    for (let index = 0; index < end; index += 1) {
        const line = context.lines[index];
        const text = line.trim();
        const h1 = !context.fenced[index] && !titleSeen ? H1.exec(line) : null;
        if (h1 !== null) {
            titleSeen = true;
            found.title = { value: classify(h1[1] ?? ''), line: index + 1 };
            continue;
        }
        const field = context.fenced[index] ? null : HEADER_LINE.exec(line);
        if (field !== null) {
            close();
            loose = undefined;
            open = { label: field[1].trim(), lines: [field[2]], line: index + 1 };
        } else if (text === '') {
            close();
            loose = undefined;
        } else if (open !== undefined) {
            open.lines.push(line.trimEnd());
        } else if (loose !== undefined) {
            loose.raw += `\n${line.trimEnd()}`;
        } else {
            loose = { place: 'header', label: '', raw: line.trimEnd(), line: index + 1 };
            addUnsupported(context, loose, 'Unexpected text in the plan header');
        }
    }
    close();
    return found;
}

function readStages(context: Context, start: number, end: number): PlanStages {
    const result: PlanStages = { present: true, stages: [], closing: undefined };
    let target: { raw: string } | undefined;
    for (let index = start; index < end; index += 1) {
        const line = context.lines[index];
        if (line.trim() === '') {
            target = undefined;
            continue;
        }
        const stage = STAGE_LINE.exec(line);
        const closing = CLOSING_LINE.exec(line);
        if (stage !== null) {
            const delimiter = STAGE_DELIMITER.exec(stage[2]);
            const head = delimiter === null ? stage[2] : stage[2].slice(0, delimiter.index);
            const parallel = head.includes('‖');
            const sequential = head.includes('→');
            const created: PlanStage = {
                number: Number(stage[1]),
                raw: line.trimEnd(),
                line: index + 1,
                stepIds: head.match(/T-\d+/g) ?? [],
                kind: parallel && sequential ? 'mixed' : parallel ? 'parallel' : sequential ? 'sequential' : 'single',
            };
            result.stages.push(created);
            target = created;
        } else if (closing !== null && result.closing === undefined) {
            const created: StagesClosing = { raw: line.trimEnd(), line: index + 1, parallel: closing[1] === 'Parallel' };
            result.closing = created;
            target = created;
        } else if (target !== undefined) {
            target.raw += `\n${line.trimEnd()}`;
        } else {
            const created: UnsupportedPlanContent = { place: 'stages', label: '', raw: line.trim(), line: index + 1 };
            addUnsupported(context, created, 'Unexpected text in the plan stages section');
            target = created;
        }
    }
    return result;
}

function readTraceability(context: Context, start: number, end: number): TraceabilityRow[] {
    const rows: TraceabilityRow[] = [];
    let index = start;
    while (index < end) {
        if (context.fenced[index] || !context.lines[index].trimStart().startsWith('|')) {
            index += 1;
            continue;
        }
        const first = index;
        while (index < end && !context.fenced[index] && context.lines[index].trimStart().startsWith('|')) {
            index += 1;
        }
        const block = context.lines.slice(first, index);
        const header = splitRow(block[0]);
        const separator = block.length > 1 ? splitRow(block[1]) : [];
        const matches =
            header.length === TRACEABILITY_COLUMNS.length &&
            header.every((cell, position) => cell === TRACEABILITY_COLUMNS[position]) &&
            separator.length === TRACEABILITY_COLUMNS.length &&
            separator.every((cell) => SEPARATOR_CELL.test(cell));
        if (!matches) {
            addUnsupported(
                context,
                { place: 'traceability', label: '', raw: block.map((row) => row.trim()).join('\n'), line: first + 1 },
                `Traceability table columns differ from "${TRACEABILITY_COLUMNS.join(' | ')}"`,
            );
            continue;
        }
        block.slice(2).forEach((rowText, offset) => {
            const line = first + 3 + offset;
            const cells = splitRow(rowText);
            if (cells.length !== TRACEABILITY_COLUMNS.length) {
                addUnsupported(
                    context,
                    { place: 'traceability', label: '', raw: rowText.trim(), line },
                    `Traceability row has ${cells.length} cells, expected ${TRACEABILITY_COLUMNS.length}`,
                );
                return;
            }
            const state = cells[4];
            const stateKnown = KNOWN_STATES.has(state);
            if (!stateKnown) {
                context.diagnostics.push({
                    kind: 'unknown-content',
                    scope: { file: context.file, line },
                    reason: `Unknown traceability state "${state}"; documented values are open, built, verified`,
                });
            }
            rows.push({
                criterion: cells[0],
                steps: classify(cells[1]),
                code: classify(cells[2]),
                test: classify(cells[3]),
                manual: /\bmanual:/i.test(cells[3]),
                state,
                stateKnown,
                line,
            });
        });
    }
    return rows;
}

function readHandoff(context: Context, start: number, end: number, handoff: PlanHandoff): void {
    let open: { name: string; lines: string[]; line: number } | undefined;
    let loose: UnsupportedPlanContent | undefined;
    const seen = new Set<string>();
    const close = (): void => {
        if (open === undefined) {
            return;
        }
        const raw = trimEndLines(open.lines);
        const { name, line } = open;
        open = undefined;
        const key = Object.prototype.hasOwnProperty.call(HANDOFF_KEYS, name) ? HANDOFF_KEYS[name as HandoffLabel] : undefined;
        if (key !== undefined && !seen.has(name)) {
            seen.add(name);
            handoff[key] = { value: classify(raw), line };
        } else {
            addUnsupported(
                context,
                { place: 'handoff', label: name, raw, line },
                key === undefined ? `Unknown session handoff field "${name}"` : `Session handoff field "${name}" occurs more than once; the first one is used`,
            );
        }
    };
    for (let index = start; index < end; index += 1) {
        const line = context.lines[index];
        const field = HANDOFF_LINE.exec(line);
        if (field !== null && !context.fenced[index]) {
            close();
            loose = undefined;
            open = { name: field[1].trim(), lines: [field[2] ?? ''], line: index + 1 };
        } else if (open !== undefined) {
            open.lines.push(line.replace(/^ {1,2}/, '').trimEnd());
        } else if (line.trim() === '') {
            loose = undefined;
        } else if (loose !== undefined) {
            loose.raw += `\n${line.trimEnd()}`;
        } else {
            loose = { place: 'handoff', label: '', raw: line.trimEnd(), line: index + 1 };
            addUnsupported(context, loose, 'Unexpected text in the session handoff section');
        }
    }
    close();
}

export function parsePlan(text: string, file: string): ParsedPlan {
    const lines = text.split('\n');
    const fenced = fencedLines(lines);
    const context: Context = { file, lines, fenced, unsupported: [], diagnostics: [] };
    const headings: Array<{ index: number; text: string }> = [];
    lines.forEach((line, index) => {
        const match = fenced[index] ? null : H2.exec(line);
        if (match !== null) {
            headings.push({ index, text: match[1] ?? '' });
        }
    });
    const header = readHeader(context, headings.length > 0 ? headings[0].index : lines.length);
    let stages: PlanStages = { present: false, stages: [], closing: undefined };
    let traceability: TraceabilityRow[] = [];
    const absent = (): HeaderField => ({ value: { state: 'absent' } });
    const handoff: PlanHandoff = {
        doneSoFar: absent(),
        nextAction: absent(),
        openDecisions: absent(),
        baseline: absent(),
        environment: absent(),
    };
    headings.forEach((heading, position) => {
        const start = heading.index + 1;
        const end = position + 1 < headings.length ? headings[position + 1].index : lines.length;
        if (heading.text === 'Stages') {
            stages = readStages(context, start, end);
        } else if (heading.text === 'Traceability') {
            traceability = [...traceability, ...readTraceability(context, start, end)];
        } else if (heading.text === 'Session handoff') {
            readHandoff(context, start, end, handoff);
        } else if (!KNOWN_SECTIONS.has(heading.text)) {
            let cut = start;
            while (cut < end && (fenced[cut] || !STEP_HEADING.test(lines[cut]))) {
                cut += 1;
            }
            addUnsupported(
                context,
                { place: 'section', label: heading.text, raw: trimEndLines(lines.slice(start, cut)).replace(/^\s+/, ''), line: heading.index + 1 },
                `Unknown plan section "${heading.text}"`,
            );
        }
    });
    const stepResult = parsePlanSteps(text, file);
    return {
        title: header.title,
        spec: header.Spec,
        status: header.Status,
        lastUpdated: header['Last updated'],
        currentStep: header['Current step'],
        stages,
        steps: stepResult.steps,
        traceability,
        handoff,
        unsupported: context.unsupported,
        diagnostics: [...context.diagnostics, ...stepResult.diagnostics],
    };
}
