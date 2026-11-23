import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as texts from '../../shared/protocol/assistantTexts';

const root = path.resolve(__dirname, '..', '..', '..');

function copyForTexts(): string[] {
    return [
        texts.copyForMissingOutputText('Junie', '.specs/a.md'),
        texts.copyForMainName('Junie', 'line', 'a.md and b.md'),
        texts.copyForMainName('Copilot', 'line'),
        texts.copyForMainLabel('Copilot'),
        texts.copyForTipText('Copilot', 'GitHub Copilot Chat'),
        texts.copyForTipText('Junie', 'Junie in AI Chat'),
        texts.copyForDoneText('GitHub Copilot Chat', 'Ctrl+V'),
        texts.copyForOpenText('GitHub Copilot Chat', 'Ctrl+V'),
        texts.copyForWithoutText('a.md', 'GitHub Copilot Chat', 'Ctrl+V', true),
        texts.copyForWithoutText('a.md', 'GitHub Copilot Chat', 'Ctrl+V', false),
    ];
}

describe('0035 amendment 2026-11-23 / AC-030: until AC-028 shows it, the texts call a path a path, not a reference', () => {
    it('AC-030 the Copy for texts of the text module say file paths', () => {
        expect(texts.copyForMissingOutputText('Junie', '.specs/a.md')).toBe('Copy for Junie: .specs/a.md was not found, so its path was left out.');
        expect(texts.copyForMainName('Junie', 'L', 'a.md and b.md')).toBe('Copy for Junie: L. Adds the paths of a.md and b.md.');
        expect(texts.copyForMainName('Junie', 'L')).toBe('Copy for Junie: L');
        expect(texts.copyForTipText('Copilot', 'GitHub Copilot Chat')).toBe('Copy for Copilot copies the prompt with the file paths and sends nothing: paste it into GitHub Copilot Chat, choose the model there, check the prompt, then send it.');
    });

    it('AC-030 no Copy for text promises a reference', () => {
        for (const text of copyForTexts()) {
            expect(text, text).not.toMatch(/referenc/i);
        }
    });

    it('AC-030 the JetBrains settings table says file paths in the setting and in both Copy for options', async () => {
        const table = await fs.readFile(path.join(root, 'jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/settings/SettingsTable.kt'), 'utf8');
        expect(table).not.toMatch(/referenc/i);
        expect(table).toContain('Copy for Copilot copies the prompt with the file paths. Paste it into GitHub Copilot Chat. Needs the GitHub Copilot plugin.');
        expect(table).toContain('Copy for Junie copies the prompt with the file paths. Paste it into Junie in AI Chat.');
    });

    it('AC-030 the README section of Copy for and the CHANGELOG entry say file paths and keep the syntax', async () => {
        const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');
        const line = readme.split('\n').find((entry) => entry.startsWith('- **Copy for Copilot** and **Copy for Junie**')) ?? '';
        expect(line).toContain('copy the prompt with the file paths (` #file:<path>` for GitHub Copilot, ` @file:<path>` for Junie)');
        expect(line).not.toContain('with file references');
        expect(line).toContain('may not turn the paths into file references');
        const changelog = await fs.readFile(path.join(root, 'CHANGELOG.md'), 'utf8');
        expect(changelog).toContain('copy the prompt with the file paths in the form `#file:<path>` or `@file:<path>`');
    });

    it('AC-030 negative control, the scan sees the old wording', () => {
        expect('Adds a.md as references.').toMatch(/referenc/i);
    });
});
