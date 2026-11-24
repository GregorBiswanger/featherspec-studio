const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)]|#{1,6})\s+/;
const OPENING = /^(?:\s+|\*{1,3}|_{1,3}|~~|\[Uncertain\]|\|)*/;
const AFTER_ID = /^[\s*_~:|.—–-]*/;
const TRAILING_PIPE = /\s*\|\s*$/;

export function withoutListMarker(text: string): string {
    return text.replace(LIST_MARKER, '');
}

const LEADING_EMPHASIS = /^\s*(\*{2,3}|_{2,3})/;
const CLOSES_AT_ID = /^\s*[:.]?\s*(?:\*|_|~~)/;

function enclosingEmphasis(listless: string, afterId: string): string | undefined {
    const marker = LEADING_EMPHASIS.exec(listless)?.[1];
    if (marker === undefined || CLOSES_AT_ID.test(afterId)) {
        return undefined;
    }
    return afterId.includes(marker) ? marker : undefined;
}

export function withoutLeadingId(text: string, id: string): string {
    const newline = text.indexOf('\n');
    const first = newline < 0 ? text : text.slice(0, newline);
    const rest = newline < 0 ? '' : text.slice(newline);
    const opened = withoutListMarker(first).replace(OPENING, '');
    if (!opened.startsWith(id)) {
        return text;
    }
    let remainder = opened.slice(id.length).replace(AFTER_ID, '');
    if (first.trimStart().startsWith('|')) {
        remainder = remainder.replace(TRAILING_PIPE, '');
    }
    const marker = enclosingEmphasis(withoutListMarker(first), opened.slice(id.length));
    if (marker !== undefined && remainder !== '') {
        remainder = marker + remainder;
    }
    return remainder === '' ? rest.replace(/^\n/, '') : remainder + rest;
}
