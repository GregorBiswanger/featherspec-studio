export type JunieForm = 'slash' | 'follow';

export const JUNIE_FORM: JunieForm = 'slash';

const WHITESPACE = /\s/;
const SLASH_LINE = /^\/sdd-([A-Za-z0-9-]+)(?: (.+))?$/s;

function referenced(paths: readonly string[]): string[] {
    return paths.filter((path) => !WHITESPACE.test(path));
}

function withReferences(line: string, paths: readonly string[], reference: (path: string) => string): string {
    return `${line}${referenced(paths).map((path) => ` ${reference(path)}`).join('')}`;
}

export function claudeText(line: string, paths: readonly string[]): string {
    return withReferences(line, paths, (path) => `@${path}`);
}

export function copilotCopyText(line: string, paths: readonly string[]): string {
    return withReferences(line, paths, (path) => `#file:${path}`);
}

function followLine(line: string): string {
    const match = SLASH_LINE.exec(line);
    if (match === null) {
        return line;
    }
    const [, name, rest] = match;
    return `Follow .claude/commands/sdd-${name}.md${rest === undefined ? '' : ` for ${rest}`}`;
}

export function junieCopyText(line: string, paths: readonly string[], form: JunieForm): string {
    return withReferences(form === 'follow' ? followLine(line) : line, paths, (path) => `@file:${path}`);
}
