import type { Diagnostic } from './diagnostics';
import type { FieldValue } from './fieldValue';

export interface HeaderField {
    value: FieldValue;
    line?: number;
}

export type PlanClassification =
    | { kind: 'absent' }
    | { kind: 'empty' }
    | { kind: 'placeholder'; raw: string }
    | { kind: 'sibling'; target: string; text: string }
    | { kind: 'archive'; target: string; text: string }
    | { kind: 'other'; raw: string };

export interface UnsupportedHeaderLine {
    label: string;
    raw: string;
    line: number;
}

export interface SpecSection {
    heading: string | undefined;
    raw: string;
    line: number;
}

export interface PlanHistoryLine {
    raw: string;
    line: number;
}

export interface ParsedSpec {
    title: HeaderField;
    status: HeaderField;
    plan: HeaderField;
    planClassification: PlanClassification;
    ticket: HeaderField;
    origin: HeaderField;
    validatedBy: HeaderField;
    clarified: HeaderField;
    unsupportedHeaderLines: UnsupportedHeaderLine[];
    sections: SpecSection[];
    planHistory: PlanHistoryLine[];
    diagnostics: Diagnostic[];
}

const KNOWN_STATUS = new Set(['Draft', 'In Progress', 'Implemented', 'Deprecated', 'Baseline']);
const PLACEHOLDERS = new Set(['_none yet_', '_none_', '—']);
const HEADER_LINE = /^\*\*([^*:\n]+):\*\*[ \t]*(.*?)[ \t]*$/;
const H1 = /^#(?:[ \t]+(.*?))?[ \t]*$/;
const H2 = /^##(?:[ \t]+(.*?))?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const MARKDOWN_LINK = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/;
const EXTERNAL_TARGET = /^(?:[a-z][a-z0-9+.-]*:|\/)/i;
const PLAN_HISTORY_HEADING = 'Plan history';

type KnownLabel = 'Status' | 'Plan' | 'Ticket' | 'Origin' | 'Validated by' | 'Clarified';
const KNOWN_LABELS: readonly KnownLabel[] = ['Status', 'Plan', 'Ticket', 'Origin', 'Validated by', 'Clarified'];

function fieldValue(raw: string): FieldValue {
    if (raw === '') {
        return { state: 'empty', raw };
    }
    return { state: PLACEHOLDERS.has(raw) ? 'placeholder' : 'value', raw };
}

function fencedLines(lines: readonly string[]): boolean[] {
    const fenced: boolean[] = [];
    let marker: string | undefined;
    for (const line of lines) {
        const match = FENCE.exec(line);
        if (marker === undefined) {
            fenced.push(match !== null);
            if (match !== null) {
                marker = match[1][0];
            }
        } else {
            fenced.push(true);
            if (match !== null && match[1][0] === marker && line.trim() === match[1]) {
                marker = undefined;
            }
        }
    }
    return fenced;
}

function trimBlankEdges(text: string): string {
    return text.replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
}

function classifyPlan(value: FieldValue): PlanClassification {
    if (value.state === 'absent') {
        return { kind: 'absent' };
    }
    if (value.state === 'empty') {
        return { kind: 'empty' };
    }
    if (value.state === 'placeholder') {
        return { kind: 'placeholder', raw: value.raw };
    }
    const link = MARKDOWN_LINK.exec(value.raw);
    if (link === null || EXTERNAL_TARGET.test(link[2])) {
        return { kind: 'other', raw: value.raw };
    }
    const target = link[2];
    const segments = target.split('/').filter((segment, index) => !(segment === '.' && index === 0));
    const last = segments[segments.length - 1];
    if (!last.endsWith('.plan.md')) {
        return { kind: 'other', raw: value.raw };
    }
    if (segments.length === 1) {
        return { kind: 'sibling', target, text: link[1] };
    }
    if (segments.slice(0, -1).includes('plan-archive')) {
        return { kind: 'archive', target, text: link[1] };
    }
    return { kind: 'other', raw: value.raw };
}

export function parseSpec(text: string, key: string): ParsedSpec {
    const lines = text.split('\n');
    const fenced = fencedLines(lines);
    const diagnostics: Diagnostic[] = [];
    const consumed = new Set<number>();

    const headings: { index: number; heading: string }[] = [];
    for (let index = 0; index < lines.length; index += 1) {
        if (!fenced[index]) {
            const match = H2.exec(lines[index]);
            if (match !== null) {
                headings.push({ index, heading: match[1] ?? '' });
            }
        }
    }
    const firstHeading = headings.length > 0 ? headings[0].index : lines.length;

    let title: HeaderField = { value: { state: 'absent' } };
    let h1Index = -1;
    for (let index = 0; index < firstHeading; index += 1) {
        const match = fenced[index] ? null : H1.exec(lines[index]);
        if (match !== null) {
            h1Index = index;
            title = { value: fieldValue(match[1] ?? ''), line: index + 1 };
            consumed.add(index);
            break;
        }
    }

    const fields = new Map<KnownLabel, HeaderField>();
    const unsupportedHeaderLines: UnsupportedHeaderLine[] = [];
    let cursor = h1Index + 1;
    while (cursor < firstHeading && lines[cursor].trim() === '') {
        cursor += 1;
    }
    for (; cursor < firstHeading && !fenced[cursor]; cursor += 1) {
        const match = HEADER_LINE.exec(lines[cursor]);
        if (match === null) {
            break;
        }
        consumed.add(cursor);
        const label = match[1].trim();
        const line = cursor + 1;
        const known = KNOWN_LABELS.find((candidate) => candidate === label);
        if (known !== undefined && !fields.has(known)) {
            fields.set(known, { value: fieldValue(match[2]), line });
            if (known === 'Status' && match[2] !== '' && !KNOWN_STATUS.has(match[2])) {
                diagnostics.push({
                    kind: 'unknown-content',
                    scope: { file: key, line },
                    reason: `unknown **Status:** value "${match[2]}"`,
                });
            }
        } else {
            unsupportedHeaderLines.push({ label, raw: lines[cursor].trimEnd(), line });
            diagnostics.push({
                kind: 'unknown-content',
                scope: { file: key, line },
                reason: known === undefined ? `unknown header line "${label}"` : `repeated header line "${label}"`,
            });
        }
    }

    const sections: SpecSection[] = [];
    const preLines: { text: string; line: number }[] = [];
    for (let index = 0; index < firstHeading; index += 1) {
        if (!consumed.has(index)) {
            preLines.push({ text: lines[index], line: index + 1 });
        }
    }
    const preRaw = trimBlankEdges(preLines.map((entry) => entry.text).join('\n'));
    if (preRaw !== '') {
        const first = preLines.find((entry) => entry.text.trim() !== '');
        sections.push({ heading: undefined, raw: preRaw, line: first?.line ?? 1 });
    }

    const planHistory: PlanHistoryLine[] = [];
    headings.forEach((entry, position) => {
        const end = position + 1 < headings.length ? headings[position + 1].index : lines.length;
        const body = lines.slice(entry.index + 1, end);
        sections.push({ heading: entry.heading, raw: trimBlankEdges(body.join('\n')), line: entry.index + 1 });
        if (entry.heading === PLAN_HISTORY_HEADING) {
            body.forEach((raw, offset) => {
                if (raw.trim() !== '') {
                    planHistory.push({ raw: raw.trimEnd(), line: entry.index + 2 + offset });
                }
            });
        }
    });

    const field = (label: KnownLabel): HeaderField => fields.get(label) ?? { value: { state: 'absent' } };
    const plan = field('Plan');
    return {
        title,
        status: field('Status'),
        plan,
        planClassification: classifyPlan(plan.value),
        ticket: field('Ticket'),
        origin: field('Origin'),
        validatedBy: field('Validated by'),
        clarified: field('Clarified'),
        unsupportedHeaderLines,
        sections,
        planHistory,
        diagnostics,
    };
}
