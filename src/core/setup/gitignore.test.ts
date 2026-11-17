import { describe, expect, it } from 'vitest';
import { completeGitignore } from './gitignore';
import { realFile } from './testing/realRelease';

const enc = (text: string) => new TextEncoder().encode(text);
const dec = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

const RELEASE = [
    '# Local config',
    '.claude/settings.local.json',
    'CLAUDE.local.md',
    '',
    '# Scan state',
    '# second comment line',
    '.sdd-scan/',
    '',
    '.sdd-update/',
    '',
].join('\n');

function complete(existing: string, release = RELEASE): string | undefined {
    const result = completeGitignore(enc(existing), enc(release));
    return result.kind === 'completed' ? dec(result.content) : undefined;
}

describe('0014 AC-012: completing .gitignore', () => {
    it('appends the missing lines in release order, each with the comment lines directly above it, and nothing else', () => {
        expect(complete('node_modules/\n')).toBe(
            ['node_modules/', '# Local config', '.claude/settings.local.json', 'CLAUDE.local.md', '# Scan state', '# second comment line', '.sdd-scan/', '.sdd-update/', ''].join('\n'),
        );
    });

    it('adds only the lines the file lacks; a line it has brings no comment with it', () => {
        expect(complete('CLAUDE.local.md\n.sdd-scan/\n')).toBe('CLAUDE.local.md\n.sdd-scan/\n# Local config\n.claude/settings.local.json\n.sdd-update/\n');
    });

    it('a comment is only taken with the line directly below it, not across a blank line', () => {
        expect(complete('', '# orphan comment\n\n.kept/\n')).toBe('.kept/\n');
    });

    it('compares without trailing spaces', () => {
        expect(complete('.sdd-scan/   \n', '.sdd-scan/\n')).toBeUndefined();
        expect(complete('.sdd-scan/\n', '.sdd-scan/   \n')).toBeUndefined();
    });

    it('negative control: leading spaces make a different line', () => {
        expect(complete(' .sdd-scan/\n', '.sdd-scan/\n')).toBe(' .sdd-scan/\n.sdd-scan/\n');
    });

    it('uses the line ending of the first line: CRLF', () => {
        expect(complete('a\r\nb\r\n', '# c\nx\n')).toBe('a\r\nb\r\n# c\r\nx\r\n');
    });

    it('uses LF when the first line ends with LF even if later lines use CRLF', () => {
        expect(complete('a\nb\r\n', 'x\n')).toBe('a\nb\r\nx\n');
    });

    it('uses LF when the file has no line ending at all, and first ends the last line', () => {
        expect(complete('a', 'x\n')).toBe('a\nx\n');
    });

    it('ends an unterminated last line with the line ending of the first line (CRLF)', () => {
        expect(complete('a\r\nb', 'x\n')).toBe('a\r\nb\r\nx\r\n');
    });

    it('an empty file gets the lines without a leading blank line', () => {
        expect(complete('', 'x\ny\n')).toBe('x\ny\n');
    });

    it('a release written with CRLF is read like one with LF', () => {
        expect(complete('a\n', '# c\r\nx\r\n')).toBe('a\n# c\nx\n');
    });

    it('changes, removes and reorders no existing line: the existing bytes are a prefix of the result', () => {
        const existing = '# mine\r\nz/\r\n\r\n  indented  \r\n';
        const result = complete(existing, RELEASE) ?? '';
        expect(result.startsWith(existing)).toBe(true);
    });

    it('returns nothing when there is nothing to add (the file is left alone)', () => {
        expect(complete(RELEASE.replace(/\n/g, '\r\n'))).toBeUndefined();
        expect(complete('# only comments in the release\n', '# a comment\n\n')).toBeUndefined();
    });

    it('a line repeated in the release is added once', () => {
        expect(complete('', 'x\ny\nx\n')).toBe('x\ny\n');
    });

    it('keeps multi-byte characters in comments intact', () => {
        expect(complete('', '# nie committen — wirklich\nx\n')).toBe('# nie committen — wirklich\nx\n');
    });

    it('bytes that are no UTF-8 are not text', () => {
        expect(completeGitignore(new Uint8Array([0xff, 0xfe]), enc('x\n'))).toEqual({ kind: 'not-text' });
        expect(completeGitignore(enc('a\n'), enc('b\n')).kind).toBe('completed');
    });

    it('works on the real .gitignore of the 1.10.0 release', async () => {
        const real = dec((await realFile('.gitignore')).bytes);
        const result = complete('node_modules/\n', real) ?? '';
        expect(result.startsWith('node_modules/\n# Local, machine-specific agent configuration')).toBe(true);
        expect(result.split('\n').filter((line) => line === '.sdd-reverse/reports/')).toHaveLength(1);
    });
});
