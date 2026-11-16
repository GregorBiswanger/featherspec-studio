const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const OPENING = /^(?:\s+|\*{1,3}|_{1,3}|~~|\[Uncertain\]|\|)*/;
const AFTER_ID = /^[\s*_~:|.—–-]*/;
const TRAILING_PIPE = /\s*\|\s*$/;

export function withoutListMarker(text: string): string {
    return text.replace(LIST_MARKER, '');
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
    return remainder === '' ? rest.replace(/^\n/, '') : remainder + rest;
}
