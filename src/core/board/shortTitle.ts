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

export function plainText(text: string): string {
    const parts = text.replace(LINK, '$1').split(CODE_SPAN);
    return parts
        .map((part, index) => (index % 2 === 1 ? part : withoutEmphasis(part)))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

export function cutAt(text: string, max: number): string {
    if (text.length <= max) {
        return text;
    }
    const window = text.slice(0, max);
    const space = window.lastIndexOf(' ');
    return `${(space > 0 ? window.slice(0, space) : text.slice(0, max - 1)).trimEnd()}…`;
}

function cut(text: string): string {
    return cutAt(text, MAX_LENGTH);
}

export function plainShort(text: string): string {
    return cut(plainText(text));
}

export function shortTitle(text: string, id: string): string {
    const first = withoutListMarker(text.split('\n')[0] ?? '');
    const bold = new RegExp(`^\\s*(\\*{2,3}|_{2,3})\\s*(?:~~)?\\s*(?:\\[Uncertain\\]\\s*)?${escaped(id)}\\s*(?:~~)?\\s*[—–:|-]\\s*(?![*_\\s])(.+?)\\s*\\1`).exec(first);
    if (bold?.[2] !== undefined) {
        return cut(plainText(bold[2]));
    }
    const rest = plainText(withoutLeadingId(text, id));
    return cut(SENTENCE.exec(rest)?.[1] ?? rest);
}
