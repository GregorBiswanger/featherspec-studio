export type InlineToken =
    | { kind: 'text'; text: string }
    | { kind: 'strong'; children: InlineToken[] }
    | { kind: 'em'; children: InlineToken[] }
    | { kind: 'code'; text: string }
    | { kind: 'link'; children: InlineToken[]; target: string };

export interface TidyResult {
    text: string;
    quote: boolean;
}

const MAX_DEPTH = 3;

function isWordChar(char: string | undefined): boolean {
    return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function push(tokens: InlineToken[], text: string): void {
    if (text === '') {
        return;
    }
    const last = tokens[tokens.length - 1];
    if (last !== undefined && last.kind === 'text') {
        last.text += text;
    } else {
        tokens.push({ kind: 'text', text });
    }
}

function closingCode(text: string, from: number): number {
    const end = text.indexOf('`', from + 1);
    return end > from + 1 ? end : -1;
}

function closingPair(text: string, from: number, marker: string): number {
    let index = from + 2;
    while (index < text.length) {
        if (text[index] === '`') {
            const end = closingCode(text, index);
            if (end > 0) {
                index = end + 1;
                continue;
            }
        }
        if (text.startsWith(marker, index) && index > from + 2 && text[index - 1] !== ' ') {
            return index;
        }
        index += 1;
    }
    return -1;
}

function closingSingle(text: string, from: number, marker: string): number {
    const first = text[from + 1];
    if (first === undefined || first === ' ' || first === marker) {
        return -1;
    }
    if (marker === '_' && isWordChar(text[from - 1])) {
        return -1;
    }
    let index = from + 1;
    while (index < text.length) {
        if (text[index] === '`') {
            const end = closingCode(text, index);
            if (end > 0) {
                index = end + 1;
                continue;
            }
        }
        if (text[index] === marker && text[index - 1] === ' ' && text[index + 1] !== ' ' && text[index + 1] !== undefined) {
            return -1;
        }
        if (text[index] === marker && text[index + 1] !== marker && text[index - 1] !== ' ' && text[index - 1] !== marker) {
            if (marker === '_' && isWordChar(text[index + 1])) {
                index += 1;
                continue;
            }
            return index;
        }
        index += 1;
    }
    return -1;
}

function link(text: string, from: number): { label: string; target: string; end: number } | undefined {
    const close = text.indexOf(']', from + 1);
    if (close < 0 || text[close + 1] !== '(') {
        return undefined;
    }
    const end = text.indexOf(')', close + 2);
    if (end < 0) {
        return undefined;
    }
    const label = text.slice(from + 1, close);
    const target = text.slice(close + 2, end);
    if (label === '' || target === '' || /\s/.test(target)) {
        return undefined;
    }
    return { label, target, end };
}

function scan(text: string, depth: number): InlineToken[] {
    const tokens: InlineToken[] = [];
    let index = 0;
    while (index < text.length) {
        const char = text[index] ?? '';
        if (char === '`') {
            const end = closingCode(text, index);
            if (end > 0) {
                tokens.push({ kind: 'code', text: text.slice(index + 1, end) });
                index = end + 1;
                continue;
            }
        }
        if (depth < MAX_DEPTH && (text.startsWith('**', index) || text.startsWith('__', index))) {
            const marker = text.slice(index, index + 2);
            const end = text[index + 2] === ' ' ? -1 : closingPair(text, index, marker);
            if (end > 0) {
                tokens.push({ kind: 'strong', children: scan(text.slice(index + 2, end), depth + 1) });
                index = end + 2;
                continue;
            }
        }
        if (depth < MAX_DEPTH && (char === '*' || char === '_')) {
            const end = closingSingle(text, index, char);
            if (end > 0) {
                tokens.push({ kind: 'em', children: scan(text.slice(index + 1, end), depth + 1) });
                index = end + 1;
                continue;
            }
        }
        if (depth < MAX_DEPTH && char === '[') {
            const found = link(text, index);
            if (found !== undefined) {
                tokens.push({ kind: 'link', children: scan(found.label, depth + 1), target: found.target });
                index = found.end + 1;
                continue;
            }
        }
        const doubled = (char === '*' || char === '_') && text[index + 1] === char;
        push(tokens, doubled ? char + char : char);
        index += doubled ? 2 : 1;
    }
    return tokens;
}

export function tokenize(text: string): InlineToken[] {
    return scan(text, 0);
}

function escapeId(id: string): string {
    return id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tidy(text: string, options: { id?: string; listItem?: boolean } = {}): TidyResult {
    const lines = text.split('\n');
    const quote = lines.length > 0 && lines.every((line) => /^\s*>(?:\s|$)/.test(line));
    let result = quote ? lines.map((line) => line.replace(/^\s*>\s?/, '')).join('\n') : text;
    if (options.listItem === true) {
        result = result.replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
    }
    if (options.id !== undefined) {
        const id = escapeId(options.id);
        result = result.replace(new RegExp(`^\\s*(?:\\*\\*|__)?${id}(?:\\*\\*|__)?\\s*[|:\\-—]\\s*`), '');
    }
    return { text: result, quote };
}

export function splitCells(text: string): { primary: string; secondary: string | undefined } {
    const cells: string[] = [];
    let current = '';
    let inCode = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index] ?? '';
        if (char === '`') {
            inCode = !inCode;
        }
        if (!inCode && text.startsWith(' | ', index)) {
            cells.push(current);
            current = '';
            index += 2;
            continue;
        }
        current += char;
    }
    cells.push(current);
    const [primary = '', ...rest] = cells.map((cell) => cell.trim());
    return { primary, secondary: rest.length === 0 ? undefined : rest.join(' · ') };
}
