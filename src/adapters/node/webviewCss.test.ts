import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rulesFor } from '../../webview/testing/css';

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

    it('AC-010: the Overview header lines are a two-column grid, label and value on one row, values without the default indent', () => {
        const list = rulesFor(css, '.detail-header');
        expect(list.some((rule) => /display:\s*grid/.test(rule.body) && /grid-template-columns:\s*max-content\s+1fr/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.detail-header > div').some((rule) => /display:\s*contents/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.detail-header dd').some((rule) => /margin:\s*0/.test(rule.body))).toBe(true);
    });

    it('AC-030: secondary text inside a selected row uses the selection foreground, not the description colour', () => {
        const rules = rulesFor(css, '.spec-row.selected .spec-derived');
        const pathRules = rulesFor(css, '.spec-row.selected .spec-path');
        expect(rules.length).toBeGreaterThan(0);
        expect(pathRules.length).toBeGreaterThan(0);
        for (const rule of [...rules, ...pathRules]) {
            expect(rule.body).toMatch(/color:\s*var\(--vscode-list-activeSelectionForeground\)/);
            expect(rule.body).not.toContain('descriptionForeground');
        }
    });

    it('AC-030 control: outside a selected row the secondary text keeps the description colour', () => {
        const rules = rulesFor(css, '.spec-derived');
        expect(rules.some((rule) => rule.body.includes('var(--vscode-descriptionForeground)'))).toBe(true);
    });

    it('AC-031: a selected row and the current navigation item carry the High Contrast active border', () => {
        for (const selector of ['.spec-row.selected', '.nav-item.current']) {
            const rules = rulesFor(css, selector);
            expect(rules.some((rule) => /var\(--vscode-contrastActiveBorder/.test(rule.body))).toBe(true);
        }
    });

    it('AC-031: a focused control and a focused row use the High Contrast active border before the focus border', () => {
        const rules = rulesFor(css, '[role="option"]:focus-visible');
        expect(rules.length).toBeGreaterThan(0);
        for (const rule of rules) {
            expect(rule.body).toMatch(/outline:\s*2px solid var\(--vscode-contrastActiveBorder,\s*var\(--vscode-focusBorder\)\)/);
        }
        const buttons = rulesFor(css, 'button:focus-visible');
        expect(buttons.some((rule) => /var\(--vscode-contrastActiveBorder,\s*var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
    });

    it('AC-031: the plain borders of rows, navigation items and panels use the contrast border where the theme sets one', () => {
        for (const selector of ['.nav-item', '.spec-row', '.panel-state']) {
            const rules = rulesFor(css, selector);
            expect(rules.some((rule) => /var\(--vscode-contrastBorder/.test(rule.body))).toBe(true);
        }
    });

    it('AC-031 control: no rule falls back to a colour literal for the contrast variables', () => {
        expect(css).not.toMatch(/--vscode-contrast(?:Active)?Border,\s*#/);
    });

    it('0006 AC-022: a Mission Control drill-down button sets no outline of its own, so the generic focus indicator of every button applies', () => {
        const drill = rulesFor(css, '.mc-drill');
        expect(drill.length).toBeGreaterThan(0);
        for (const rule of drill) {
            expect(rule.body).not.toContain('outline');
        }
        expect(rulesFor(css, 'button:focus-visible').some((rule) => rule.body.includes('outline: 2px solid'))).toBe(true);
    });
});
