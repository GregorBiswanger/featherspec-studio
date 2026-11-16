import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AC-026: colours come from the theme', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');

    it('main.css holds no colour literal and uses the VS Code theme variables', () => {
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla)\(/);
        expect(css).toContain('var(--vscode-');
    });

    it('the focus outline of a card and of a control is set and is not removed (negative control: the rule exists)', () => {
        expect(css).toMatch(/\.card:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--vscode-focusBorder\)/);
        expect(css).not.toMatch(/outline:\s*(none|0)\b/);
    });

    it('the description is limited to two lines', () => {
        expect(css).toMatch(/-webkit-line-clamp:\s*2/);
    });
});
