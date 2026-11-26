import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

const RELEASE_0_1_0_SHA256 = 'd75e0e69632e411429c12afbabbb081c2ab3f46b4c2a8d89979e14d5324d8d07';
const REPOSITORY = 'https://github.com/GregorBiswanger/featherspec-studio';

async function read(file: string): Promise<string> {
    return fs.readFile(path.join(root, file), 'utf8');
}

export function releaseSection(changelog: string, heading: string): string {
    const lines = changelog.split('\n');
    const start = lines.findIndex((line) => line.startsWith(heading));
    if (start < 0) {
        return '';
    }
    const rest = lines.slice(start + 1);
    const stop = rest.findIndex((line) => /^## \[/.test(line) || /^\[[^\]]+\]: /.test(line));
    const body = stop < 0 ? rest : rest.slice(0, stop);
    while (body.length > 0 && body[body.length - 1] === '') {
        body.pop();
    }
    return [lines[start], ...body].join('\n') + '\n';
}

export function sha256(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('0036 AC-020: CHANGELOG keeps 0.1.0 as published and holds 0.2.0', () => {
    it('extracts a section up to the next heading or the link block', () => {
        const text = '# C\n\n## [0.2.0] - Unreleased\nA\n\n## [0.1.0] - x\nB\n\n[0.2.0]: u\n';
        expect(releaseSection(text, '## [0.1.0]')).toBe('## [0.1.0] - x\nB\n');
        expect(releaseSection(text, '## [0.2.0]')).toBe('## [0.2.0] - Unreleased\nA\n');
    });

    it('negative control: one changed byte in 0.1.0 changes its hash', async () => {
        const section = releaseSection(await read('CHANGELOG.md'), '## [0.1.0]');
        const changed = section.replace('First release.', 'First release!');
        expect(changed).not.toBe(section);
        expect(sha256(changed)).not.toBe(RELEASE_0_1_0_SHA256);
    });

    it('0.1.0 is byte-identical to its section at bf236fc', async () => {
        expect(sha256(releaseSection(await read('CHANGELOG.md'), '## [0.1.0]'))).toBe(RELEASE_0_1_0_SHA256);
    });

    it('0.2.0 is Unreleased, sits above 0.1.0, and is the only Unreleased section', async () => {
        const headings = (await read('CHANGELOG.md')).match(/^## \[.*$/gm) ?? [];
        expect(headings).toEqual(['## [0.2.0] - Unreleased', '## [0.1.0] - 2026-11-20']);
    });

    it('0.2.0 names the empty state, the JetBrains plugin 0.1.0 with its three Sends, and the README change', async () => {
        const section = releaseSection(await read('CHANGELOG.md'), '## [0.2.0]');
        for (const text of [
            'No specs yet. Start with /sdd-specify',
            'JetBrains IDEs, plugin 0.1.0',
            '**Send to Junie**',
            '**Send to Claude Code**',
            '**Send to Copilot**',
            '### Changed',
            'README',
        ]) {
            expect(section, text).toContain(text);
        }
    });

    it('the file ends with the compare links of 6.8', async () => {
        expect((await read('CHANGELOG.md')).endsWith(
            `\n[0.2.0]: ${REPOSITORY}/compare/v0.1.0...v0.2.0\n[0.1.0]: ${REPOSITORY}/releases/tag/v0.1.0\n`,
        )).toBe(true);
    });
});
