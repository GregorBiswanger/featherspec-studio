import type { ProjectRead } from '../../core/specs/readProject';

export type ParityCategory = 'shared' | 'host' | 'n-a' | 'deliberately different';

export interface Rule {
    category: string;
    reference: string;
    note?: string;
}

export interface ParitySource {
    pending: string[];
    specs: Record<string, { default?: Rule; ranges?: Record<string, Rule>; criteria?: Record<string, Rule> }>;
}

export interface Criterion {
    spec: string;
    id: string;
    struck: boolean;
}

export interface ParityRow {
    spec: string;
    id: string;
    category: string | undefined;
    reference: string | undefined;
    note?: string;
}

export type ParityFailureKind =
    | 'missing'
    | 'duplicate'
    | 'no-category'
    | 'unknown-category'
    | 'no-reference'
    | 'unknown-criterion'
    | 'bad-pd'
    | 'struck-not-na';

export interface ParityFailure {
    kind: ParityFailureKind;
    row: ParityRow;
}

const CATEGORIES: readonly string[] = ['shared', 'host', 'n-a', 'deliberately different'];
const SHARED_REFERENCES: readonly string[] = ['C-read', 'C-next', 'C-views', 'C-setup', 'shared-test'];
const DEPRECATED_SPECS: ReadonlySet<string> = new Set(['0008', '0009', '0010', '0011', '0012']);
const RANGE = /^AC-(\d+)\.\.AC-(\d+)$/;
const NUMBERED = /^AC-(\d+)$/;
const PD_ID = /PD-\d{3}/g;
const PD_ROW = /^\| (PD-\d{3}) \|/gm;
const BOLD_CRITERION = /^(?:(?:[-*+]|\d+[.)])\s+)?(?:~~)?(?:\*\*|__)/;

function keyOf(entry: { spec: string; id: string }): string {
    return `${entry.spec} ${entry.id}`;
}

function byKey(left: { spec: string; id: string }, right: { spec: string; id: string }): number {
    const [leftKey, rightKey] = [keyOf(left), keyOf(right)];
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function countKeys(rows: readonly ParityRow[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
        counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1);
    }
    return counts;
}

function rangeRules(ranges: Record<string, Rule> | undefined, id: string): Rule[] {
    const numbered = NUMBERED.exec(id);
    if (ranges === undefined || numbered === null) {
        return [];
    }
    const number = Number(numbered[1]);
    return Object.entries(ranges).flatMap(([range, rule]) => {
        const bounds = RANGE.exec(range);
        return bounds !== null && Number(bounds[1]) <= number && number <= Number(bounds[2]) ? [rule] : [];
    });
}

function rulesFor(spec: string, id: string, source: ParitySource): Rule[] {
    const entry = source.specs[spec];
    if (entry === undefined) {
        return [];
    }
    const explicit = entry.criteria?.[id];
    const direct = [...(explicit === undefined ? [] : [explicit]), ...rangeRules(entry.ranges, id)];
    if (direct.length > 0) {
        return direct;
    }
    return entry.default === undefined ? [] : [entry.default];
}

function isBold(text: string): boolean {
    return BOLD_CRITERION.test(text);
}

export function chooseOccurrences<T extends { id: string; text: string }>(occurrences: readonly T[]): T[] {
    const chosen = new Map<string, { index: number; occurrence: T }>();
    occurrences.forEach((occurrence, index) => {
        const current = chosen.get(occurrence.id);
        if (current === undefined) {
            chosen.set(occurrence.id, { index, occurrence });
        } else if (!isBold(current.occurrence.text) && isBold(occurrence.text)) {
            chosen.set(occurrence.id, { index: current.index, occurrence });
        }
    });
    return [...chosen.values()].sort((left, right) => left.index - right.index).map((entry) => entry.occurrence);
}

function rowFrom(spec: string, id: string, rule: Rule | undefined): ParityRow {
    if (rule?.note === undefined) {
        return { spec, id, category: rule?.category, reference: rule?.reference };
    }
    return { spec, id, category: rule.category, reference: rule.reference, note: rule.note };
}

function referenceFailure(row: ParityRow, pdIds: readonly string[]): ParityFailureKind | undefined {
    const reference = row.reference?.trim() ?? '';
    if (reference === '') {
        return 'no-reference';
    }
    if (row.category === 'shared') {
        return SHARED_REFERENCES.includes(reference) ? undefined : 'no-reference';
    }
    if (row.category === 'host') {
        return /H-\d+/.test(reference) && /0034 AC-\d{3}/.test(reference) ? undefined : 'no-reference';
    }
    if (row.category === 'deliberately different') {
        const named = reference.match(PD_ID);
        if (named === null) {
            return 'no-reference';
        }
        return named.every((id) => pdIds.includes(id)) ? undefined : 'bad-pd';
    }
    return undefined;
}

function failureOf(
    row: ParityRow,
    known: ReadonlyMap<string, boolean>,
    counts: ReadonlyMap<string, number>,
    pdIds: readonly string[],
): ParityFailureKind | undefined {
    const struck = known.get(keyOf(row));
    if (struck === undefined) {
        return 'unknown-criterion';
    }
    if ((counts.get(keyOf(row)) ?? 0) > 1) {
        return 'duplicate';
    }
    if (row.category === undefined || row.category === '') {
        return 'no-category';
    }
    if (!CATEGORIES.includes(row.category)) {
        return 'unknown-category';
    }
    if ((struck || DEPRECATED_SPECS.has(row.spec)) && row.category !== 'n-a') {
        return 'struck-not-na';
    }
    return referenceFailure(row, pdIds);
}

export function collectCriteria(project: ProjectRead): Criterion[] {
    return project.specs
        .filter((entry) => entry.number !== '0034' && (entry.folder === 'done' || entry.folder === 'active') && entry.parsed !== undefined)
        .sort((left, right) => (left.number < right.number ? -1 : left.number > right.number ? 1 : 0))
        .flatMap((entry) =>
            chooseOccurrences(entry.parsed?.criteria ?? []).map((criterion) => ({ spec: entry.number, id: criterion.id, struck: criterion.struck })),
        );
}

export function buildRows(criteria: readonly Criterion[], source: ParitySource): ParityRow[] {
    const known = new Set(criteria.map(keyOf));
    const rows = criteria.flatMap((criterion) => {
        const rules = rulesFor(criterion.spec, criterion.id, source);
        return rules.length === 0
            ? [rowFrom(criterion.spec, criterion.id, undefined)]
            : rules.map((rule) => rowFrom(criterion.spec, criterion.id, rule));
    });
    const unknown = Object.entries(source.specs)
        .flatMap(([spec, entry]) => Object.keys(entry.criteria ?? {}).map((id) => rowFrom(spec, id, entry.criteria?.[id])))
        .filter((row) => !known.has(keyOf(row)))
        .sort(byKey);
    return [...rows, ...unknown];
}

export function checkRows(rows: readonly ParityRow[], criteria: readonly Criterion[], pdIds: readonly string[]): ParityFailure[] {
    const known = new Map(criteria.map((criterion) => [keyOf(criterion), criterion.struck]));
    const counts = countKeys(rows);
    const missing = criteria
        .filter((criterion) => !counts.has(keyOf(criterion)))
        .map((criterion) => ({ kind: 'missing' as const, row: { spec: criterion.spec, id: criterion.id, category: undefined, reference: undefined } }));
    const reported = rows.flatMap((row) => {
        const kind = failureOf(row, known, counts, pdIds);
        return kind === undefined ? [] : [{ kind, row }];
    });
    return [...missing, ...reported];
}

export function renderMarkdown(rows: readonly ParityRow[]): string {
    const lines = rows.map((row) =>
        `| ${cell(row.spec)} | ${cell(row.id)} | ${cell(row.category ?? 'uncategorised')} | ${cell(row.reference ?? '')} | ${cell(row.note ?? '')} |`,
    );
    return [
        '# JetBrains parity matrix',
        '',
        'Generated from `.specs/done/` and `.specs/active/` by `src/adapters/node/parity.ts`. Do not edit by hand.',
        '',
        '| Spec | AC | Category | Reference | Note |',
        '| --- | --- | --- | --- | --- |',
        ...lines,
        '',
    ].join('\n');
}

function cell(value: string): string {
    return value.replace(/\|/g, '\\|');
}

export function readPdIds(productDecisions: string): string[] {
    return [...productDecisions.matchAll(PD_ROW)].map((match) => match[1]);
}
