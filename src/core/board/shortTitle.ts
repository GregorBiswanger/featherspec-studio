import { withoutLeadingId, withoutListMarker } from './idText';

const MAX_LENGTH = 80;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const CODE_SPAN = /`+([^`]*)`+/;
const SENTENCE = /^([\s\S]*?[.!?])(?=\s|$)/;

function escaped(id: string): string {
    return id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withoutEmphasis(part: string): string {
    return part
        .replace(/~~/g, '')
        .replace(/\*/g, '')
        .replace(/(?<![A-Za-z0-9])_+|_+(?![A-Za-z0-9])/g, '');
}

function plain(text: string): string {
    const parts = text.replace(LINK, '$1').split(CODE_SPAN);
    return parts
        .map((part, index) => (index % 2 === 1 ? part : withoutEmphasis(part)))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

function cut(text: string): string {
    if (text.length <= MAX_LENGTH) {
        return text;
    }
    const window = text.slice(0, MAX_LENGTH);
    const space = window.lastIndexOf(' ');
    return `${(space > 0 ? window.slice(0, space) : text.slice(0, MAX_LENGTH - 1)).trimEnd()}…`;
}

export function plainShort(text: string): string {
    return cut(plain(text));
}

export function shortTitle(text: string, id: string): string {
    const first = withoutListMarker(text.split('\n')[0] ?? '');
    const bold = new RegExp(`^\\s*(\\*{2,3}|_{2,3})\\s*(?:~~)?\\s*(?:\\[Uncertain\\]\\s*)?${escaped(id)}\\s*(?:~~)?\\s*[—–:|-]\\s*(?![*_\\s])(.+?)\\s*\\1`).exec(first);
    if (bold?.[2] !== undefined) {
        return cut(plain(bold[2]));
    }
    const rest = plain(withoutLeadingId(text, id));
    return cut(SENTENCE.exec(rest)?.[1] ?? rest);
}
