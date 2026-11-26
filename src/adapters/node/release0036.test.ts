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

const PACKAGE_JSON_ON_MAIN_SHA256 = '4fc5894926000928985c72357e31f8fc18f50f4cc3aa561765d04b02cc3e2e56';
const PACKAGE_LOCK_ON_MAIN_SHA256 = 'ba5001f24ce3493ba8fa11ef0adb509c56521f669e21b561ac0f342a59f600a1';

export function withMainVersions(text: string): string {
    return text
        .replace('\n  "version": "0.2.0",', '\n  "version": "0.1.0",')
        .replace('\n      "version": "0.2.0",', '\n      "version": "0.1.0",');
}

export function jetbrainsSection(readme: string): string {
    const lines = readme.split('\n');
    const start = lines.indexOf('## JetBrains IDEs');
    if (start < 0) {
        return '';
    }
    const stop = lines.findIndex((line, index) => index > start && line.startsWith('## '));
    return lines.slice(start, stop < 0 ? undefined : stop).join('\n');
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

describe('0036 AC-019: package.json and the lock carry 0.2.0 and change nothing else', () => {
    it('negative control: a second changed line breaks the match with main', async () => {
        const text = await read('package.json');
        expect(sha256(withMainVersions(text.replace('"license"', '"licence"')))).not.toBe(PACKAGE_JSON_ON_MAIN_SHA256);
    });

    it('package.json is 0.2.0', async () => {
        expect(JSON.parse(await read('package.json')).version).toBe('0.2.0');
    });

    it('its diff against main is the version value only', async () => {
        expect(sha256(withMainVersions(await read('package.json')))).toBe(PACKAGE_JSON_ON_MAIN_SHA256);
    });

    it('the two root fields of package-lock.json are 0.2.0 and nothing else changed', async () => {
        const text = await read('package-lock.json');
        const lock = JSON.parse(text);
        expect(lock.version).toBe('0.2.0');
        expect(lock.packages[''].version).toBe('0.2.0');
        expect(sha256(withMainVersions(text))).toBe(PACKAGE_LOCK_ON_MAIN_SHA256);
    });
});

describe('0036 AC-021: README JetBrains IDEs says how to install', () => {
    it('negative control: the old sentence is found in the section', () => {
        expect(jetbrainsSection('## JetBrains IDEs\nThe plugin is not on the JetBrains Marketplace yet.\n## Next\n'))
            .toContain('not on the JetBrains Marketplace yet');
    });

    it('names the Marketplace path and the release ZIP', async () => {
        const section = jetbrainsSection(await read('README.md'));
        for (const text of ['Settings | Plugins | Marketplace', '*FeatherSpec Studio*', 'jetbrains-v<version>', 'Install Plugin from Disk…']) {
            expect(section, text).toContain(text);
        }
    });

    it('no longer says the plugin is not on the Marketplace yet', async () => {
        expect(await read('README.md')).not.toContain('not on the JetBrains Marketplace yet');
    });

    it('keeps the heading that gives the anchor #jetbrains-ides', async () => {
        const headings = (await read('README.md')).split('\n').filter((line) => line === '## JetBrains IDEs');
        expect(headings).toHaveLength(1);
    });
});

export function sectionAfterGo(checklist: string): string {
    const lines = checklist.split('\n');
    const go = lines.indexOf('## Go');
    const start = lines.indexOf('## JetBrains Marketplace and VS Code 0.2.0 (0036)');
    if (go < 0 || start < go) {
        return '';
    }
    const stop = lines.findIndex((line, index) => index > start && line.startsWith('## '));
    return lines.slice(start, stop < 0 ? undefined : stop).join('\n');
}

describe('0036 AC-034: the checklist section after Go and the size limits', () => {
    it('negative control: a section above Go is not found', () => {
        expect(sectionAfterGo('## JetBrains Marketplace and VS Code 0.2.0 (0036)\nA\n## Go\n')).toBe('');
    });

    it('lists AC-013, AC-018, AC-023, AC-024 and AC-030 to AC-033, and the order of spec §5', async () => {
        const section = sectionAfterGo(await read('docs/release-checklist.md'));
        expect(section).not.toBe('');
        for (const id of ['AC-013', 'AC-018', 'AC-023', 'AC-024', 'AC-030', 'AC-031', 'AC-032', 'AC-033']) {
            expect(section, id).toContain(id);
        }
        expect(section).toContain('§5');
    });

    it('AGENTS.md stays at most 15 000 bytes and activeContext.md below 7 000', async () => {
        expect(Buffer.byteLength(await read('AGENTS.md'), 'utf8')).toBeLessThanOrEqual(15000);
        expect(Buffer.byteLength(await read('.memory-bank/activeContext.md'), 'utf8')).toBeLessThan(7000);
    });
});
