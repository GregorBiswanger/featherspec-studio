import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { declarations, parseRules, rulesFor } from '../../webview/testing/css';

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

    it('AC-018: the number and title of a card are limited to two lines, the date is pushed to the right and no rule styles the removed description, chip or footer', () => {
        expect(rulesFor(css, '.card-head').some((rule) => /-webkit-line-clamp:\s*2/.test(rule.body) && /overflow:\s*hidden/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.card-change').some((rule) => /margin-left:\s*auto/.test(rule.body))).toBe(true);
        expect(css).not.toMatch(/\.card-summary|\.card-foot\b|\.card-secondary \.icon \{[^}]*\}\s*\.card-state \.state-chip/);
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

    it('0018 AC-026: the current navigation item has a 2 px bottom border, the contrast active border and no marker rule', () => {
        const rules = rulesFor(css, '.nav-item.current');
        expect(rules.some((rule) => /border-bottom:\s*2px solid/.test(rule.body))).toBe(true);
        expect(rules.some((rule) => /border-color:\s*var\(--vscode-contrastActiveBorder/.test(rule.body))).toBe(true);
        expect(css).not.toContain('.nav-item [data-marker]');
    });

    it('0018 AC-003: no rule is left of the removed header, tiles, distribution bar or attention list, and no .mc- selector', () => {
        expect(css).not.toMatch(/\.mc-/);
        for (const gone of ['.ov-header', '.ov-tile', '.ov-distribution', '.ov-segment', '.ov-progress', '.ov-formula', '.ov-attention', '.ov-reason', '.ov-specs', '.ov-tiles']) {
            expect(rulesFor(css, gone), gone).toEqual([]);
        }
        expect(rulesFor(css, '.ov-figure-list').length).toBeGreaterThan(0);
    });

    it('0018 AC-006: a spec row stays on one line: title and status cut by an ellipsis, number, step, warning icon and Copy never cut', () => {
        const row = rulesFor(css, '.ov-row');
        expect(row.some((rule) => /white-space:\s*nowrap/.test(rule.body))).toBe(true);
        for (const selector of ['.ov-row .ov-title', '.ov-row .ov-status']) {
            const rules = rulesFor(css, selector);
            expect(rules.some((rule) => /flex:\s*0 1 auto/.test(rule.body))).toBe(true);
        }
        expect(rulesFor(css, '.ov-row .ov-status').some((rule) => /text-overflow:\s*ellipsis/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.ov-title').some((rule) => /text-overflow:\s*ellipsis/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.ov-row .step-text').some((rule) => /flex:\s*none/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.ov-row-item .copy-button').some((rule) => /flex:\s*none/.test(rule.body))).toBe(true);
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

    it('0006 AC-022: an Overview drill-down button sets no outline of its own, so the generic focus indicator of every button applies', () => {
        const drill = rulesFor(css, '.ov-drill');
        expect(drill.length).toBeGreaterThan(0);
        for (const rule of drill) {
            expect(rule.body).not.toContain('outline');
        }
        expect(rulesFor(css, 'button:focus-visible').some((rule) => rule.body.includes('outline: 2px solid'))).toBe(true);
    });
});

const COLOUR_PROPERTIES = /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|box-shadow|text-decoration(?:-color)?|caret-color|accent-color|column-rule(?:-color)?|scrollbar-color|text-shadow)$/;
const NEUTRAL_WORDS = new Set(['currentcolor', 'transparent', 'inherit', 'none', 'solid', 'dashed', 'dotted', 'double', 'inset', 'underline', 'auto', 'initial', 'unset']);

function residue(value: string): string[] {
    let rest = value;
    let previous = '';
    while (previous !== rest) {
        previous = rest;
        rest = rest.replace(/var\(--(?:vscode|fs)-[\w-]+\)/g, ' ');
        rest = rest.replace(/var\(--(?:vscode|fs)-[\w-]+,\s*([^()]*)\)/g, ' $1 ');
    }
    return rest
        .split(/[\s,/]+/)
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word !== '' && !NEUTRAL_WORDS.has(word) && !/^-?\d*\.?\d+(?:px|em|rem|%|ms|s)?$/.test(word));
}

function isVscodeChain(value: string): boolean {
    const match = /^var\(--vscode-[\w-]+(?:,\s*(.+))?\)$/.exec(value.trim());
    if (match === null) {
        return false;
    }
    return match[1] === undefined || isVscodeChain(match[1]);
}

function tsxFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return tsxFiles(full);
        }
        return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
    });
}

describe('0013 AC-001, AC-002, AC-003: the Studio stylesheet stays native to the theme', () => {
    const webviewDir = path.resolve(__dirname, '..', '..', 'webview');
    const css = readFileSync(path.join(webviewDir, 'main.css'), 'utf8');
    const all = declarations(css);

    it('AC-001: every colour-bearing declaration resolves only to --vscode-* variables, currentColor, transparent or inherit', () => {
        const offenders = all.filter((entry) => COLOUR_PROPERTIES.test(entry.property) && residue(entry.value).length > 0).map((entry) => `${entry.selectors.join(',')} { ${entry.property}: ${entry.value} }`);
        expect(offenders).toEqual([]);
    });

    it('AC-001 control: the residue check flags a named colour, a hex value and a foreign variable', () => {
        expect(residue('1px solid red')).toEqual(['red']);
        expect(residue('#fff')).toEqual(['#fff']);
        expect(residue('var(--brand)')).not.toEqual([]);
        expect(residue('1px solid var(--vscode-contrastBorder, var(--vscode-panel-border))')).toEqual([]);
    });

    it('AC-001: every --fs-* alias is defined only as a chain of --vscode-* variables, and every alias used is defined', () => {
        const definitions = all.filter((entry) => entry.property.startsWith('--'));
        expect(definitions.length).toBeGreaterThan(0);
        for (const entry of definitions) {
            expect(entry.property, entry.property).toMatch(/^--fs-[\w-]+$/);
            expect(isVscodeChain(entry.value), `${entry.property}: ${entry.value}`).toBe(true);
        }
        const defined = new Set(definitions.map((entry) => entry.property));
        const used = [...css.matchAll(/var\((--fs-[\w-]+)/g)].map((match) => match[1]);
        for (const name of used) {
            expect(defined.has(name ?? ''), name).toBe(true);
        }
        expect([...css.matchAll(/var\((--[\w-]+)/g)].every((match) => /^--(?:vscode|fs)-/.test(match[1] ?? ''))).toBe(true);
    });

    it('AC-001 control: the chain check rejects a literal fallback', () => {
        expect(isVscodeChain('var(--vscode-charts-blue)')).toBe(true);
        expect(isVscodeChain('var(--vscode-contrastBorder, var(--vscode-panel-border))')).toBe(true);
        expect(isVscodeChain('var(--vscode-charts-blue, #0000ff)')).toBe(false);
        expect(isVscodeChain('blue')).toBe(false);
    });

    it('AC-001: font families come only from the two VS Code font variables; no @font-face and no @import', () => {
        for (const entry of all.filter((item) => item.property === 'font-family')) {
            expect(entry.value).toMatch(/^(?:var\(--vscode-(?:editor-)?font-family\)|inherit)$/);
        }
        for (const entry of all.filter((item) => item.property === 'font')) {
            expect(entry.value).toBe('inherit');
        }
        expect(css).not.toMatch(/@font-face|@import/);
    });

    it('AC-001: no inline style in src/webview carries a colour', () => {
        const offenders: string[] = [];
        for (const file of tsxFiles(webviewDir)) {
            const text = readFileSync(file, 'utf8');
            for (const match of text.matchAll(/style=\{\{([^}]*)\}\}/g)) {
                if (/(?:color|background|border|fill|stroke|outline|shadow)\s*:/i.test(match[1] ?? '')) {
                    offenders.push(`${path.relative(webviewDir, file)}: ${match[0]}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('AC-003: no rule removes an outline or makes it transparent', () => {
        for (const entry of all.filter((item) => item.property.startsWith('outline'))) {
            expect(entry.value, entry.selectors.join(',')).not.toMatch(/^(?:none|0)\b/);
        }
    });

    it('§3.1: one state-colour mapping, each state tinting through --fs-tint from its theme variable', () => {
        const expected: Record<string, string> = {
            Backlog: 'var(--vscode-descriptionForeground)',
            Ready: 'var(--vscode-charts-blue)',
            Active: 'var(--vscode-charts-purple)',
            Review: 'var(--vscode-charts-yellow)',
            Done: 'var(--vscode-charts-green)',
            Blocked: 'var(--vscode-charts-red)',
        };
        for (const [state, variable] of Object.entries(expected)) {
            const rules = rulesFor(css, `[data-board-state="${state}"]`);
            expect(rules.some((rule) => rule.body.includes(`--fs-tint: ${variable}`)), state).toBe(true);
        }
    });

    it('§3.1: a state chip keeps its text in the foreground colour, tints only icon and border, and falls back to the contrast border', () => {
        const chip = rulesFor(css, '.state-chip');
        expect(chip.some((rule) => /border[^;]*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(chip.some((rule) => /color:\s*var\(--vscode-foreground\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.state-chip .icon').some((rule) => /color:\s*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.vscode-high-contrast .state-chip').some((rule) => /border-color:\s*var\(--vscode-contrastBorder\)/.test(rule.body))).toBe(true);
    });

    it('full-height frame: the studio is a flex column of the viewport height and main scrolls on its own', () => {
        expect(rulesFor(css, '.studio').some((rule) => /display:\s*flex/.test(rule.body) && /flex-direction:\s*column/.test(rule.body) && /height:\s*100vh/.test(rule.body))).toBe(true);
        expect(rulesFor(css, 'main').some((rule) => /flex:\s*1/.test(rule.body) && /min-height:\s*0/.test(rule.body) && /overflow:\s*auto/.test(rule.body))).toBe(true);
    });

    it('AC-015: columns share the width by flexbox (200 to 360 px, strips 32 px, gap 8 px), headers are sticky, the board scrolls sideways and no media rule touches it', () => {
        const value = (selector: string, property: string): string | undefined =>
            rulesFor(css, selector)
                .flatMap((rule) => declarations(`${selector} {${rule.body}}`))
                .filter((entry) => entry.property === property)
                .map((entry) => entry.value)
                .pop();
        const pixels = (text: string | undefined): number => Number(/^(\d+)px$/.exec(text ?? '')?.[1] ?? Number.NaN);

        expect(value('.columns', 'display')).toBe('flex');
        expect(value('.columns', 'flex-direction')).toBe('row');
        expect(value('.columns', 'overflow-x')).toBe('auto');
        expect(value('.column', 'box-sizing')).toBe('border-box');
        expect(value('.column', 'flex')).toBe('1 1 0');
        expect(pixels(value('.column', 'min-width'))).toBe(200);
        expect(pixels(value('.column', 'max-width'))).toBe(360);
        expect(value('.column[data-narrow]', 'flex')).toBe('0 0 32px');
        expect(pixels(value('.column[data-narrow]', 'min-width'))).toBe(32);
        expect(pixels(value('.column[data-narrow]', 'max-width'))).toBe(32);
        expect(value('.column[data-narrow] .column-name', 'writing-mode')).toBe('vertical-rl');

        const gap = pixels(value('.columns', 'gap'));
        const padding = Number(/^\d+px\s+(\d+)px$/.exec(value('main', 'padding') ?? '')?.[1]);
        const wide = pixels(value('.column', 'min-width'));
        const strip = pixels(value('.column[data-narrow]', 'flex-basis') ?? value('.column[data-narrow]', 'min-width'));
        const need = (wideCount: number, narrowCount: number): number => wideCount * wide + narrowCount * strip + (wideCount + narrowCount - 1) * gap + 2 * padding;
        expect(need(2, 4)).toBe(2 * 200 + 4 * 32 + 5 * 8 + 2 * 16);
        expect(need(2, 4)).toBeLessThanOrEqual(640);
        expect(need(5, 1)).toBe(5 * 200 + 32 + 5 * 8 + 2 * 16);
        expect(need(5, 1)).toBeLessThanOrEqual(1240);

        for (const rule of rulesFor(css, '.column')) {
            expect(rule.body).not.toMatch(/(?:^|[\s;])(?:max-)?height\s*:/);
        }
        expect(rulesFor(css, '.column-heading').some((rule) => /position:\s*sticky/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.column-cards').some((rule) => /overflow-y:\s*auto/.test(rule.body))).toBe(true);
        const board = parseRules(css).filter((rule) => rule.media !== undefined && rule.selectors.some((selector) => /\.columns?\b/.test(selector)));
        expect(board).toEqual([]);
    });

    it('AC-015: the stylesheet has no grid track for the board and no column hint rule', () => {
        expect(css).not.toMatch(/grid-auto-columns|minmax\(240px|\.column-hint/);
    });

    it('AC-014: no code under src/webview uses dangerouslySetInnerHTML or innerHTML', () => {
        const root = webviewDir;
        const files = (function walk(dir: string): string[] {
            return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []));
        })(root);
        expect(files.length).toBeGreaterThan(20);
        const offenders = files.filter((file) => /dangerouslySetInnerHTML|innerHTML/.test(readFileSync(file, 'utf8')));
        expect(offenders).toEqual([]);
    });

    it('AC-002: every transition lasts at most 150 ms and a prefers-reduced-motion block sets all transitions to none', () => {
        const transitions = all.filter((entry) => entry.property === 'transition' && entry.media === undefined);
        expect(transitions.length).toBeGreaterThan(0);
        for (const entry of transitions) {
            for (const match of entry.value.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
                const ms = match[2] === 's' ? Number(match[1]) * 1000 : Number(match[1]);
                expect(ms, entry.selectors.join(',')).toBeLessThanOrEqual(150);
            }
        }
        const reduced = parseRules(css).filter((rule) => /prefers-reduced-motion:\s*reduce/.test(rule.media ?? ''));
        expect(reduced.some((rule) => rule.selectors.includes('*') && /transition:\s*none/.test(rule.body))).toBe(true);
    });

    it('AC-003: every control this spec adds or restyles sets no outline of its own, so the shared focus rule with contrastActiveBorder or focusBorder applies', () => {
        for (const selector of ['.ov-drill', '.ov-row', '.section-toggle', '.open-file', '.copy-button', '.related-link']) {
            const rules = parseRules(css).filter((rule) => rule.selectors.some((candidate) => candidate.startsWith(selector)));
            expect(rules.length, selector).toBeGreaterThan(0);
            for (const rule of rules) {
                expect(rule.body, selector).not.toMatch(/outline/);
            }
        }
        expect(rulesFor(css, 'button:focus-visible').some((rule) => /outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
    });
});


describe('0005 AC-019: the panel follows the theme without being reopened', () => {
    const webviewDir = path.resolve(__dirname, '..', '..', 'webview');
    const THEME_READS = /classList|vscode-(?:light|dark|high-contrast)|getComputedStyle|matchMedia|getPropertyValue/;

    it('no panel UI module reads or caches the theme, so every colour stays a live --vscode-* lookup', () => {
        const offenders = tsxFiles(webviewDir)
            .filter((file) => !file.includes(`${path.sep}testing${path.sep}`))
            .filter((file) => THEME_READS.test(readFileSync(file, 'utf8')))
            .map((file) => path.relative(webviewDir, file));
        expect(offenders).toEqual([]);
    });

    it('negative control: the check flags a module that reads the theme class or a computed colour', () => {
        expect(THEME_READS.test("document.body.classList.contains('vscode-dark')")).toBe(true);
        expect(THEME_READS.test("getComputedStyle(document.body).getPropertyValue('--vscode-foreground')")).toBe(true);
        expect(THEME_READS.test('const label = "Board";')).toBe(false);
    });
});

describe('0014 AC-001: the setup button of the panel states', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');

    it('the first action is a primary button on the button colours, every other one uses the secondary button colours', () => {
        const primary = rulesFor(css, '.panel-state button');
        expect(primary.some((rule) => rule.body.includes('var(--vscode-button-background)') && rule.body.includes('var(--vscode-button-foreground)'))).toBe(true);
        const secondary = rulesFor(css, '.panel-state .actions button + button');
        expect(secondary.some((rule) => rule.body.includes('var(--vscode-button-secondaryBackground') && rule.body.includes('var(--vscode-button-secondaryForeground'))).toBe(true);
    });

    it('negative control, a selector that does not exist has no rule', () => {
        expect(rulesFor(css, '.panel-state .no-such-button')).toEqual([]);
    });
});

describe('0016 AC-017, AC-019: Copy is the primary button and keeps its size', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');

    it('AC-017: .copy-button uses the primary button colours and hover', () => {
        const rules = rulesFor(css, '.copy-button');
        expect(rules.some((rule) => rule.body.includes('var(--vscode-button-background)') && rule.body.includes('var(--vscode-button-foreground)'))).toBe(true);
        expect(rulesFor(css, '.copy-button:hover').some((rule) => rule.body.includes('var(--vscode-button-hoverBackground'))).toBe(true);
    });

    it('AC-019: .copy-button has a min-width of at least 14ch on a content-box and no error colour or outline in any of its rules', () => {
        const rules = parseRules(css).filter((rule) => rule.selectors.some((selector) => selector.startsWith('.copy-button')));
        expect(rules.length).toBeGreaterThan(0);
        const widths = rules.flatMap((rule) => [...rule.body.matchAll(/min-width:\s*(\d+(?:\.\d+)?)ch/g)].map((match) => Number(match[1])));
        expect(widths.length).toBeGreaterThan(0);
        expect(Math.max(...widths)).toBeGreaterThanOrEqual('Could not copy'.length);
        expect(rulesFor(css, '.copy-button').some((rule) => /box-sizing:\s*content-box/.test(rule.body))).toBe(true);
        for (const rule of rules) {
            expect(rule.body).not.toContain('errorForeground');
            expect(rule.body).not.toMatch(/outline/);
        }
    });

    it('0016 §6.5: the live region stays visually hidden and stays in the accessibility tree (1 px box, clipped, out of the flow, no display:none or visibility:hidden)', () => {
        const body = rulesFor(css, '.visually-hidden')
            .map((rule) => rule.body)
            .join(';');
        expect(body).toMatch(/position:\s*absolute/);
        expect(body).toMatch(/width:\s*1px/);
        expect(body).toMatch(/height:\s*1px/);
        expect(body).toMatch(/overflow:\s*hidden/);
        expect(body).toMatch(/clip-path:\s*inset\(50%\)|clip:\s*rect\(0/);
        expect(body).not.toMatch(/display:\s*none|visibility:\s*hidden|opacity:\s*0\b/);
    });

    it('0016 §6.5 control: the checked pattern rejects a rule that hides with display:none', () => {
        expect('display: none').toMatch(/display:\s*none|visibility:\s*hidden|opacity:\s*0\b/);
    });

    it('AC-019: nothing that styles the copy feedback uses the error colour (the old status line is gone)', () => {
        expect(rulesFor(css, '.next-step .detail-status')).toEqual([]);
    });

    it('0017 §6.5: nothing reserves the corner of a card head for the removed Move to... and no rule styles the removed Dismiss button', () => {
        expect(rulesFor(css, '.card-head::before')).toEqual([]);
        expect(rulesFor(css, '.card-head::after')).toEqual([]);
        expect(rulesFor(css, '.secondary-button')).toEqual([]);
        expect(rulesFor(css, '.secondary-button:hover')).toEqual([]);
        expect(rulesFor(css, '.card').some((rule) => /position:\s*relative/.test(rule.body))).toBe(false);
        expect(css).not.toContain('card-head::before');
        expect(css).not.toContain('secondary-button');
    });

    it('0017 §6.5 control: the check sees a reserved corner when one is present', () => {
        const sample = '.card-head::before { content: ""; float: right; width: 60px; }';
        expect(rulesFor(sample, '.card-head::before')).toHaveLength(1);
    });
});
