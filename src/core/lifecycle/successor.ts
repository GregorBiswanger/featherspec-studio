import type { ParsedSpec } from '../specs/parseSpec';
import type { Successor } from './model';

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
    const header = parsed.successor.value;
    if (header.state !== 'absent') {
        return classify(header.raw);
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
