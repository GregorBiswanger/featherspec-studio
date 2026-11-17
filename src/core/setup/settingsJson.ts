import { parseJsoncObject, plainValue, samePlainValue, type JsoncMember, type JsoncObject } from './jsonc';

export interface TextInsert {
    offset: number;
    text: string;
}

export interface SettingsCompletion {
    content: Uint8Array;
    inserted: readonly TextInsert[];
    keptKeys: readonly string[];
}

export type SettingsResult =
    | { kind: 'not-an-object' }
    | { kind: 'nothing-to-add'; keptKeys: readonly string[] }
    | ({ kind: 'completed' } & SettingsCompletion);

interface Style {
    text: string;
    eol: string;
    unit: string;
}

const DEFAULT_UNIT = '  ';

function decode(bytes: Uint8Array): string | undefined {
    try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
        return undefined;
    }
}

function firstLineEnding(text: string): string {
    const newline = text.indexOf('\n');
    return newline > 0 && text[newline - 1] === '\r' ? '\r\n' : '\n';
}

function lineStart(text: string, offset: number): number {
    return text.lastIndexOf('\n', offset - 1) + 1;
}

function leadingWhitespace(text: string, offset: number): string {
    const start = lineStart(text, offset);
    return /^[ \t]*/.exec(text.slice(start, offset))?.[0] ?? '';
}

function startsItsLine(text: string, offset: number): boolean {
    return /^[ \t]*$/.test(text.slice(lineStart(text, offset), offset));
}

function detectUnit(text: string, root: JsoncObject): string {
    const first = root.members[0];
    if (first !== undefined && startsItsLine(text, first.keyStart)) {
        const indent = leadingWhitespace(text, first.keyStart);
        if (indent !== '') {
            return indent;
        }
    }
    return DEFAULT_UNIT;
}

function endOfLine(text: string, from: number): number {
    let position = from;
    let end = from;
    for (;;) {
        while (text[position] === ' ' || text[position] === '\t') {
            position += 1;
        }
        if (text.startsWith('//', position)) {
            const newline = text.slice(position).search(/[\r\n]/);
            return newline === -1 ? text.length : position + newline;
        }
        if (text.startsWith('/*', position)) {
            const close = text.indexOf('*/', position + 2) + 2;
            if (text.slice(position, close).includes('\n')) {
                return end;
            }
            position = close;
            end = close;
            continue;
        }
        return end;
    }
}

function memberIndent(style: Style, object: JsoncObject): string {
    const last = object.members[object.members.length - 1];
    if (last !== undefined && startsItsLine(style.text, last.keyStart)) {
        return leadingWhitespace(style.text, last.keyStart);
    }
    return leadingWhitespace(style.text, object.start) + style.unit;
}

function render(style: Style, value: unknown, indent: string): string {
    return JSON.stringify(value, null, style.unit).split('\n').join(style.eol + indent);
}

function insertionsFor(style: Style, object: JsoncObject, entries: readonly string[]): TextInsert[] {
    const { text, eol } = style;
    const indent = memberIndent(style, object);
    const close = object.end - 1;
    const last = object.members[object.members.length - 1];
    if (last === undefined) {
        const between = text.slice(object.start + 1, close);
        if (!between.includes('\n')) {
            const closeIndent = leadingWhitespace(text, object.start);
            return [{ offset: object.start + 1, text: entries.map((entry) => eol + indent + entry).join(',') + eol + closeIndent }];
        }
        const newline = text.lastIndexOf('\n', close);
        const offset = newline > 0 && text[newline - 1] === '\r' ? newline - 1 : newline;
        return [{ offset, text: entries.map((entry) => eol + indent + entry).join(',') }];
    }
    const valueEnd = last.value.end;
    const after = last.commaAfter === undefined ? valueEnd : last.commaAfter + 1;
    const inline = !text.slice(after, close).includes('\n');
    if (inline) {
        return last.commaAfter === undefined
            ? [{ offset: valueEnd, text: `, ${entries.join(', ')}` }]
            : [{ offset: after, text: ` ${entries.join(', ')},` }];
    }
    const lineEnd = endOfLine(text, after);
    if (last.commaAfter !== undefined) {
        return [{ offset: lineEnd, text: entries.map((entry) => `${eol}${indent}${entry},`).join('') }];
    }
    return [
        { offset: valueEnd, text: ',' },
        { offset: lineEnd, text: entries.map((entry) => eol + indent + entry).join(',') },
    ];
}

function collect(style: Style, existing: JsoncObject, release: JsoncObject, path: readonly string[], inserts: TextInsert[], kept: string[]): void {
    const entries: string[] = [];
    const handled = new Set<string>();
    for (const member of release.members) {
        if (handled.has(member.key)) {
            continue;
        }
        handled.add(member.key);
        const found = findMember(existing, member.key);
        if (found === undefined) {
            entries.push(`${JSON.stringify(member.key)}: ${render(style, plainValue(member.value), memberIndent(style, existing))}`);
        } else if (found.value.kind === 'object' && member.value.kind === 'object') {
            collect(style, found.value, member.value, [...path, member.key], inserts, kept);
        } else if (!samePlainValue(plainValue(found.value), plainValue(member.value))) {
            kept.push([...path, member.key].join(' > '));
        }
    }
    if (entries.length > 0) {
        inserts.push(...insertionsFor(style, existing, entries));
    }
}

function findMember(object: JsoncObject, key: string): JsoncMember | undefined {
    return [...object.members].reverse().find((member) => member.key === key);
}

export function completeSettings(existing: Uint8Array, release: Uint8Array): SettingsResult {
    const text = decode(existing);
    const root = text === undefined ? undefined : parseJsoncObject(text);
    if (text === undefined || root === undefined) {
        return { kind: 'not-an-object' };
    }
    const releaseText = decode(release);
    const releaseRoot = releaseText === undefined ? undefined : parseJsoncObject(releaseText);
    if (releaseRoot === undefined) {
        return { kind: 'nothing-to-add', keptKeys: [] };
    }
    const style: Style = { text, eol: firstLineEnding(text), unit: detectUnit(text, root) };
    const inserted: TextInsert[] = [];
    const keptKeys: string[] = [];
    collect(style, root, releaseRoot, [], inserted, keptKeys);
    if (inserted.length === 0) {
        return { kind: 'nothing-to-add', keptKeys };
    }
    const ordered = inserted.map((insert, index) => ({ insert, index })).sort((first, second) => first.insert.offset - second.insert.offset || first.index - second.index).map((entry) => entry.insert);
    let result = '';
    let position = 0;
    for (const insert of ordered) {
        result += text.slice(position, insert.offset) + insert.text;
        position = insert.offset;
    }
    result += text.slice(position);
    return { kind: 'completed', content: new TextEncoder().encode(result), inserted: ordered, keptKeys };
}
