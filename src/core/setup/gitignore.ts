export type GitignoreResult = { kind: 'not-text' } | { kind: 'nothing-to-add' } | { kind: 'completed'; content: Uint8Array };

function decode(bytes: Uint8Array): string | undefined {
    try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
        return undefined;
    }
}

function isComment(line: string): boolean {
    return line.startsWith('#');
}

export function completeGitignore(existing: Uint8Array, release: Uint8Array): GitignoreResult {
    const existingText = decode(existing);
    const releaseText = decode(release);
    if (existingText === undefined || releaseText === undefined) {
        return { kind: 'not-text' };
    }
    const present = new Set(existingText.split(/\r?\n/).map((line) => line.trimEnd()));
    const lines = releaseText.split(/\r?\n/);
    const added: string[] = [];
    lines.forEach((raw, index) => {
        const line = raw.trimEnd();
        if (line === '' || isComment(line) || present.has(line)) {
            return;
        }
        present.add(line);
        const comments: string[] = [];
        for (let above = index - 1; above >= 0 && isComment((lines[above] ?? '').trimEnd()); above--) {
            comments.unshift(lines[above] ?? '');
        }
        added.push(...comments, raw);
    });
    if (added.length === 0) {
        return { kind: 'nothing-to-add' };
    }
    const newline = existingText.indexOf('\n');
    const eol = newline > 0 && existingText[newline - 1] === '\r' ? '\r\n' : '\n';
    const open = existingText !== '' && !existingText.endsWith('\n');
    const appended = new TextEncoder().encode((open ? eol : '') + added.map((line) => line + eol).join(''));
    const content = new Uint8Array(existing.length + appended.length);
    content.set(existing, 0);
    content.set(appended, existing.length);
    return { kind: 'completed', content };
}
