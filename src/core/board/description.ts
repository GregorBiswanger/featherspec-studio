import type { SpecSection } from '../specs/parseSpec';

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])(?:\s|$)/;
const TABLE = /^\s*\|/;
const QUOTE = /^\s*>/;

function isParagraphStart(line: string): boolean {
    return !(HEADING.test(line) || LIST_ITEM.test(line) || TABLE.test(line) || QUOTE.test(line));
}

function firstParagraph(raw: string): string | undefined {
    const lines = raw.split('\n');
    let index = 0;
    while (index < lines.length) {
        const line = lines[index] ?? '';
        if (line.trim() === '') {
            index += 1;
            continue;
        }
        const fence = FENCE.exec(line);
        if (fence !== null) {
            const marker = fence[1]?.[0] ?? '`';
            index += 1;
            while (index < lines.length && !(new RegExp(`^ {0,3}${marker}{3,}\\s*$`).test(lines[index] ?? ''))) {
                index += 1;
            }
            index += 1;
            continue;
        }
        const block: string[] = [];
        while (index < lines.length && (lines[index] ?? '').trim() !== '') {
            block.push((lines[index] ?? '').trim());
            index += 1;
        }
        if (isParagraphStart(block[0] ?? '')) {
            return block.join(' ');
        }
    }
    return undefined;
}

export function describeSpec(sections: readonly SpecSection[]): string | undefined {
    const first = sections.find((section) => section.heading !== undefined);
    return first === undefined ? undefined : firstParagraph(first.raw);
}
