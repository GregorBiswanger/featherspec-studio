import type { ParsedSpec } from '../specs/parseSpec';
import type { Successor } from './model';

const HEADER_PREFIX = /^\*\*Successor:\*\*[ \t]*/;
const BODY_LINE = /^[ \t]*successor:[ \t]*(.*?)[ \t]*$/i;
const LINK = /^\[([^\]]*)\]\(([^)\s]+)\)$/;
const REMOVED = 'none — behaviour removed';

export function successorText(successor: Successor): string {
    switch (successor.kind) {
        case 'link':
            return `successor: ${successor.text} (${successor.target})`;
        case 'none':
            return `successor: ${REMOVED}`;
        case 'not-available':
            return 'successor: not available';
    }
}

function classify(value: string): Successor {
    const link = LINK.exec(value);
    if (link !== null) {
        return { kind: 'link', text: link[1], target: link[2] };
    }
    return value === REMOVED ? { kind: 'none' } : { kind: 'not-available' };
}

export function readSuccessor(parsed: ParsedSpec): Successor {
    const header = parsed.unsupportedHeaderLines.find((line) => line.label === 'Successor');
    if (header !== undefined) {
        return classify(header.raw.trim().replace(HEADER_PREFIX, ''));
    }
    for (const section of parsed.sections) {
        for (const line of section.raw.split('\n')) {
            const match = BODY_LINE.exec(line);
            if (match !== null) {
                return classify(match[1]);
            }
        }
    }
    return { kind: 'not-available' };
}
