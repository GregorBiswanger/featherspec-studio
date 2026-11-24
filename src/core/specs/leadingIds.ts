import type { Diagnostic } from './diagnostics';

export interface AcceptanceCriterion {
    id: string;
    text: string;
    illustration: string | undefined;
    line: number;
    uncertain: boolean;
    struck: boolean;
}

export interface Requirement {
    id: string;
    text: string;
    line: number;
}

export interface LocatedIds {
    criteria: AcceptanceCriterion[];
    requirements: Requirement[];
    diagnostics: Diagnostic[];
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/;
const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;
const HEADING_LEVEL = /^ {0,3}(#{1,6})\s+(.*)$/;
const ORDERED_MARKER = /^\s*\d+[.)]/;
const HEADING_SEPARATOR = /^\s*(?:\*{1,3}|_{1,3}|~~)*\s*(?:[—–:|-]|$)/;
const BOLD_PARAGRAPH = /^\s*(?:~~)?(?:\*\*|__)/;
const PREFIX = /^(?:\s+|\*{1,3}|_{1,3}|~~|\[Uncertain\])*/;
const AC_ID = /^AC-\d+(?![A-Za-z0-9-]|\.\d)/;
const FR_ID = /^FR-\d+(?:\.\d+)*(?![A-Za-z0-9-]|\.\d)/;

export function fencedLines(lines: readonly string[]): boolean[] {
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

function indentOf(line: string): number {
    return line.replace(/\t/g, '    ').length - line.replace(/\t/g, '    ').trimStart().length;
}

function isBlank(line: string): boolean {
    return line.trim() === '';
}

function isQuote(line: string): boolean {
    return line.trimStart().startsWith('>');
}

interface Leading {
    kind: 'AC' | 'FR';
    id: string;
    uncertain: boolean;
    struck: boolean;
}

function leadingId(content: string): Leading | undefined {
    const prefix = PREFIX.exec(content)?.[0] ?? '';
    const rest = content.slice(prefix.length);
    const ac = AC_ID.exec(rest);
    const fr = ac === null ? FR_ID.exec(rest) : null;
    const hit = ac ?? fr;
    if (hit === null) {
        return undefined;
    }
    return { kind: ac !== null ? 'AC' : 'FR', id: hit[0], uncertain: prefix.includes('[Uncertain]'), struck: prefix.includes('~~') };
}

function headingId(line: string): { level: number; found: Leading } | undefined {
    const heading = HEADING_LEVEL.exec(line);
    if (heading === null) {
        return undefined;
    }
    const found = leadingId(heading[2]);
    if (found?.kind !== 'AC') {
        return undefined;
    }
    const prefix = PREFIX.exec(heading[2])?.[0] ?? '';
    return HEADING_SEPARATOR.test(heading[2].slice(prefix.length + found.id.length)) ? { level: heading[1].length, found } : undefined;
}

function firstCell(line: string): string | undefined {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) {
        return undefined;
    }
    const body = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
    return body.slice(0, body.includes('|') ? body.indexOf('|') : body.length);
}

export function locateLeadingIds(lines: readonly string[], fenced: readonly boolean[], key: string): LocatedIds {
    const criteria: AcceptanceCriterion[] = [];
    const requirements: Requirement[] = [];
    const described = new Set<string>();

    const blockEnd = (start: number, listIndent: number | undefined): number => {
        let end = start;
        for (let next = start + 1; next < lines.length; next += 1) {
            const line = lines[next];
            if (isBlank(line)) {
                let ahead = next + 1;
                while (ahead < lines.length && isBlank(lines[ahead])) {
                    ahead += 1;
                }
                const continues =
                    listIndent !== undefined &&
                    ahead < lines.length &&
                    !isQuote(lines[ahead]) &&
                    indentOf(lines[ahead]) > listIndent &&
                    !(fenced[ahead] === false && HEADING.test(lines[ahead]));
                if (!continues) {
                    break;
                }
                next = ahead - 1;
                continue;
            }
            if (!fenced[next]) {
                const item = LIST_ITEM.exec(line);
                if (HEADING.test(line) || isQuote(line)) {
                    break;
                }
                if (item !== null && (listIndent === undefined || indentOf(line) <= listIndent)) {
                    break;
                }
            }
            end = next;
        }
        return end;
    };

    const headingEnd = (start: number, level: number): number => {
        let end = start;
        for (let next = start + 1; next < lines.length; next += 1) {
            if (!fenced[next]) {
                const heading = HEADING_LEVEL.exec(lines[next]);
                if (heading !== null && heading[1].length <= level) {
                    break;
                }
            }
            end = next;
        }
        return end;
    };

    const illustrationAfter = (end: number): string | undefined => {
        let next = end + 1;
        while (next < lines.length && isBlank(lines[next])) {
            next += 1;
        }
        if (next >= lines.length || fenced[next] || !isQuote(lines[next])) {
            return undefined;
        }
        const quote: string[] = [];
        for (; next < lines.length && !fenced[next] && isQuote(lines[next]); next += 1) {
            quote.push(lines[next].trim());
        }
        return quote.join('\n');
    };

    const textOf = (start: number, end: number): string =>
        lines
            .slice(start, end + 1)
            .map((line, offset) => (offset === 0 ? line.trim() : line.trimEnd()))
            .join('\n')
            .trimEnd();

    for (let index = 0; index < lines.length; index += 1) {
        if (fenced[index]) {
            continue;
        }
        const line = lines[index];
        const item = LIST_ITEM.exec(line);
        let found: Leading | undefined;
        let listIndent: number | undefined;
        let tableRow = false;
        let headingLevel: number | undefined;
        let ordered = false;
        if (item !== null) {
            found = leadingId(item[4]);
            listIndent = indentOf(line);
            ordered = ORDERED_MARKER.test(line);
        } else if (BOLD_PARAGRAPH.test(line) && (index === 0 || isBlank(lines[index - 1]) || HEADING.test(lines[index - 1]))) {
            found = leadingId(line);
        } else if (headingId(line) !== undefined) {
            const heading = headingId(line);
            found = heading?.found;
            headingLevel = heading?.level;
        } else {
            const cell = firstCell(line);
            const candidate = cell === undefined ? undefined : leadingId(cell);
            if (candidate?.kind === 'FR') {
                found = candidate;
                tableRow = true;
            }
        }
        if (found === undefined) {
            continue;
        }
        if (ordered && found.kind === 'AC' && described.has(found.id)) {
            continue;
        }
        const end = tableRow ? index : headingLevel !== undefined ? headingEnd(index, headingLevel) : blockEnd(index, listIndent);
        if (found.kind === 'FR') {
            requirements.push({ id: found.id, text: textOf(index, end), line: index + 1 });
        } else {
            if (!ordered) {
                described.add(found.id);
            }
            criteria.push({
                id: found.id,
                text: textOf(index, end),
                illustration: illustrationAfter(end),
                line: index + 1,
                uncertain: found.uncertain,
                struck: found.struck,
            });
        }
    }

    const diagnostics: Diagnostic[] = [];
    for (const criterion of criteria) {
        const others = criteria.filter((other) => other.id === criterion.id && other !== criterion);
        if (others.length > 0) {
            diagnostics.push({
                kind: 'duplicate',
                tier: 'note',
                scope: { file: key, line: criterion.line },
                reason: `${criterion.id} is defined more than once in this spec; other definitions at line ${others.map((other) => other.line).join(', ')}`,
            });
        }
    }
    return { criteria, requirements, diagnostics };
}
