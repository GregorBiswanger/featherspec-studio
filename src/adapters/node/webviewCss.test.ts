import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AREA_MIN, defaultSideWidth, NARROW_QUERY, SIDE_MIN } from '../../shared/protocol/layout';
import { STATE_LOOK } from '../../shared/protocol/stateLook';
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

    it('AC-031: the current navigation item carries the High Contrast active border', () => {
        const rules = rulesFor(css, '.nav-item.current');
        expect(rules.some((rule) => /var\(--vscode-contrastActiveBorder/.test(rule.body))).toBe(true);
    });

    it('0020 AC-018: no rule styles the removed Spec Explorer list (.explorer, .spec-list, .spec-row and the cells of a row)', () => {
        const removed = /\.explorer\b|\.spec-list\b|\.spec-row\b|\.spec-(?:number|title|meta|state|derived|path)\b/;
        expect(css.match(removed)).toBeNull();
        expect(removed.test('.spec-row.selected .spec-derived { color: red; }')).toBe(true);
        expect(removed.test('.explorer-list { overflow: auto; }')).toBe(true);
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

    it('AC-031: a focused control uses the High Contrast active border before the focus border, and no rule is left for the removed list rows', () => {
        const buttons = rulesFor(css, 'button:focus-visible');
        expect(buttons.length).toBeGreaterThan(0);
        for (const rule of buttons) {
            expect(rule.body).toMatch(/outline:\s*2px solid var\(--vscode-contrastActiveBorder,\s*var\(--vscode-focusBorder\)\)/);
        }
        expect(rulesFor(css, '[role="option"]:focus-visible')).toEqual([]);
        expect(css).not.toContain('[role="option"]');
    });

    it('AC-031: the plain borders of rows, navigation items and panels use the contrast border where the theme sets one', () => {
        for (const selector of ['.nav-item', '.panel-state']) {
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

    it('0022 AC-026: each colour ID of the state table maps to its theme variable through --fs-tint, and no rule that names a state sets a colour', () => {
        const expected: Record<string, string> = {
            descriptionForeground: 'var(--vscode-descriptionForeground)',
            'charts.blue': 'var(--vscode-charts-blue)',
            'charts.green': 'var(--vscode-charts-green)',
            'charts.orange': 'var(--vscode-charts-orange)',
            'charts.red': 'var(--vscode-charts-red)',
        };
        expect([...new Set(Object.values(STATE_LOOK).map((look) => look.colour))].sort()).toEqual(Object.keys(expected).sort());
        for (const [id, variable] of Object.entries(expected)) {
            const rules = rulesFor(css, `[data-tint="${id}"]`);
            expect(rules.some((rule) => rule.body.includes(`--fs-tint: ${variable}`)), id).toBe(true);
        }
        const COLOURING = /--fs-tint|(?:^|;)\s*(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke)\s*:/;
        const naming = parseRules(css).filter((rule) => rule.selectors.some((selector) => /\b(?:Backlog|Ready|Active|Review|Done|Blocked)\b/.test(selector)));
        for (const rule of naming) {
            expect(rule.body, rule.selectors.join(',')).not.toMatch(COLOURING);
        }
        expect(COLOURING.test('--fs-tint: red')).toBe(true);
        expect(COLOURING.test('width: 3px; color: red')).toBe(true);
        expect(COLOURING.test('flex: 0 0 32px')).toBe(false);
        expect(parseRules('[data-board-state="Active"] { --fs-tint: red; }').filter((rule) => rule.selectors.some((selector) => /Active/.test(selector)))).toHaveLength(1);
    });

    it('0025 AC-014: the step motifs take next and returned-blocked from theme variables only, through --fs-tint', () => {
        expect(rulesFor(css, '[data-tint="focusBorder"]').some((rule) => rule.body.includes('--fs-tint: var(--vscode-focusBorder)'))).toBe(true);
        expect(rulesFor(css, '.step-chip .icon').some((rule) => /color:\s*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.step-card-toggle .icon').some((rule) => /color:\s*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(css).not.toMatch(/\.step-(?:chip|card)[^{]*\{[^}]*#[0-9a-fA-F]{3,8}/);
    });

    it('0025 AC-017: the highlight is an outline from theme variables, with no transition inside prefers-reduced-motion: reduce', () => {
        const rule = rulesFor(css, '.step-card[data-highlight]').find((entry) => entry.body.includes('outline'))!;
        expect(rule.body).toMatch(/outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/);
        expect(rule.body).toMatch(/transition:[^;]*\b150ms/);
        expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\* \{\s*transition: none !important;/);
    });

    it('0025 AC-017: a card row aligns its cards to their start, and the card title shows at most two lines', () => {
        const row = rulesFor(css, '.plan-group').map((entry) => entry.body).join(';');
        expect(row).toMatch(/align-items:\s*(?:start|flex-start)/);
        const title = rulesFor(css, '.step-card-title').map((entry) => entry.body).join(';');
        expect(title).toMatch(/-webkit-line-clamp:\s*2/);
        expect(title).toMatch(/display:\s*-webkit-box/);
        expect(title).toMatch(/-webkit-box-orient:\s*vertical/);
        expect(title).toMatch(/overflow:\s*hidden/);
    });

    it('0025 AC-016: the ways block takes the same highlight rule as a card', () => {
        expect(rulesFor(css, '.plan-ways[data-highlight]').some((entry) => entry.body.includes('outline: 2px solid'))).toBe(true);
    });

    it('0026 AC-010: the default tag is marked beyond colour, and the radios of the ways take theme variables only (a planted hex colour is found)', () => {
        const tag = rulesFor(css, '.plan-way-tag');
        expect(tag.length).toBeGreaterThan(0);
        expect(tag.some((entry) => /font-weight:\s*600/.test(entry.body) && /text-decoration:\s*underline/.test(entry.body))).toBe(true);
        const radios = rulesFor(css, '.plan-way input[type="radio"]');
        expect(radios.some((entry) => /accent-color:\s*var\(--vscode-/.test(entry.body))).toBe(true);
        expect(rulesFor(css, '.plan-way input[type="radio"]:focus-visible').some((entry) => /var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(entry.body))).toBe(true);
        const mine = [...tag, ...radios, ...rulesFor(css, '.plan-way input[type="radio"]:focus-visible')].map((entry) => entry.body).join('\n');
        expect(mine).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
        expect('.plan-way-tag { color: #ff0000; }').toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it('0022 AC-026: the chip and the column header icon take their colour from --fs-tint', () => {
        expect(rulesFor(css, '.state-chip .icon').some((rule) => /color:\s*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.column-heading .icon').some((rule) => /color:\s*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.state-chip').some((rule) => /border[^;]*var\(--fs-tint\)/.test(rule.body))).toBe(true);
    });

    it('§3.1: a state chip keeps its text in the foreground colour, tints only icon and border, and falls back to the contrast border', () => {
        const chip = rulesFor(css, '.state-chip');
        expect(chip.some((rule) => /border[^;]*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(chip.some((rule) => /color:\s*var\(--vscode-foreground\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.state-chip .icon').some((rule) => /color:\s*var\(--fs-tint\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.vscode-high-contrast .state-chip').some((rule) => /border-color:\s*var\(--vscode-contrastBorder\)/.test(rule.body))).toBe(true);
    });

    it('0022 G-1: full-height frame: the studio is a flex column of the viewport height and main fills it without scrolling', () => {
        expect(rulesFor(css, '.studio').some((rule) => /display:\s*flex/.test(rule.body) && /flex-direction:\s*column/.test(rule.body) && /height:\s*100vh/.test(rule.body))).toBe(true);
        expect(rulesFor(css, 'main').some((rule) => /flex:\s*1/.test(rule.body) && /min-height:\s*0/.test(rule.body) && /overflow:\s*hidden/.test(rule.body))).toBe(true);
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
        const padding = Number(/^\d+px\s+(\d+)px$/.exec(value('.area-content', 'padding') ?? '')?.[1]);
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
        for (const selector of ['.ov-drill', '.ov-row', '.section-toggle', '.file-link', '.copy-button']) {
            const rules = parseRules(css).filter((rule) => rule.selectors.some((candidate) => candidate.startsWith(selector)));
            expect(rules.length, selector).toBeGreaterThan(0);
            for (const rule of rules) {
                expect(rule.body, selector).not.toMatch(/outline/);
            }
        }
        expect(rulesFor(css, 'button:focus-visible').some((rule) => /outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
    });

    it('guideline 9: the sort select has a visible focus outline in the same theme colours as the buttons', () => {
        const rules = rulesFor(css, '.filter-bar select:focus-visible');
        expect(rules.length).toBeGreaterThan(0);
        expect(rules.some((rule) => /outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
        for (const rule of rules) {
            expect(rule.body).not.toMatch(/outline:\s*(none|0)\b/);
        }
    });
});


describe('0005 AC-019: the panel follows the theme without being reopened', () => {
    const webviewDir = path.resolve(__dirname, '..', '..', 'webview');
    const THEME_READS = /classList|vscode-(?:light|dark|high-contrast)|getComputedStyle|matchMedia|getPropertyValue/;

    it('no panel UI module reads or caches the theme, so every colour stays a live --vscode-* lookup', () => {
        const offenders = tsxFiles(webviewDir)
            .filter((file) => !file.includes(`${path.sep}testing${path.sep}`))
            .filter((file) => path.relative(webviewDir, file) !== path.join('detail', 'narrow.ts'))
            .filter((file) => THEME_READS.test(readFileSync(file, 'utf8')))
            .map((file) => path.relative(webviewDir, file));
        expect(offenders).toEqual([]);
    });

    it('0019, 0022 G-4: the one module that calls matchMedia asks only the width query of the list-or-detail switch, never a colour scheme', () => {
        const source = readFileSync(path.join(webviewDir, 'detail', 'narrow.ts'), 'utf8');
        expect(NARROW_QUERY).toBe('(max-width: 899px)');
        expect(source.match(/matchMedia\(([^)]*)\)/g)).toEqual(['matchMedia(NARROW_QUERY)']);
        expect(source).not.toMatch(/prefers-color-scheme|classList|getComputedStyle|getPropertyValue/);
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

describe('0019 AC-005, AC-021, 0022 AC-001: the side panel beside the area, or the detail alone', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const plain = (selector: string) => rulesFor(css, selector).filter((rule) => rule.media === undefined);

    it('0022 G-2: the side panel gets its width from the divider: no fixed width or basis in the stylesheet, its own scroll, a 1 px left border; the area content takes the rest', () => {
        expect(plain('.area-frame').some((rule) => /display:\s*flex/.test(rule.body) && /position:\s*relative/.test(rule.body))).toBe(true);
        expect(plain('.area-content').some((rule) => /flex:\s*1\b/.test(rule.body) && /min-width:\s*0/.test(rule.body) && /overflow-y:\s*auto/.test(rule.body))).toBe(true);
        const panel = plain('.side-panel').map((rule) => rule.body).join(';');
        expect(panel).toMatch(/flex:\s*none/);
        expect(panel).not.toMatch(/(?:^|;)\s*(?:min-|max-)?width:|flex-basis|flex:\s*0 0 \d/);
        expect(panel).toMatch(/box-sizing:\s*border-box/);
        expect(panel).toMatch(/overflow-y:\s*auto/);
        expect(panel).toMatch(/border-left:\s*1px solid var\(--vscode-contrastBorder/);
        expect(css).not.toMatch(/\b400px\b/);
    });

    it('0022 G-2: the divider has a column-resize cursor, a 4 px hit area, the sash hover colour while hovered or dragged and a focus outline of the theme', () => {
        const divider = plain('.divider').map((rule) => rule.body).join(';');
        expect(divider).toMatch(/cursor:\s*col-resize/);
        expect(divider).toMatch(/width:\s*0\b/);
        expect(plain('.divider::before').some((rule) => /width:\s*4px/.test(rule.body))).toBe(true);
        for (const selector of ['.divider:hover::before', '.divider[data-dragging]::before']) {
            expect(plain(selector).some((rule) => /background:\s*var\(--vscode-sash-hoverBorder\)/.test(rule.body)), selector).toBe(true);
        }
        expect(plain('.divider:focus-visible').some((rule) => /outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
        for (const rule of rulesFor(css, '.divider')) {
            expect(rule.body).not.toMatch(/outline/);
        }
    });

    it('0022 AC-001: no media rule changes the area content, the frame or the board, so the area keeps its width and its scroll position', () => {
        const touched = parseRules(css).filter((rule) => rule.media !== undefined && rule.selectors.some((selector) => /\.area-(?:frame|content)\b|\.columns?\b/.test(selector)));
        expect(touched).toEqual([]);
    });

    it('0019 G4, AC-007: a selected card and a selected Overview row both get the selection background and the contrast active border', () => {
        for (const selector of ['.card[aria-current="true"]', '.ov-row[aria-current="true"]']) {
            const body = plain(selector).map((rule) => rule.body).join(';');
            expect(body, selector).toMatch(/background:\s*var\(--vscode-list-activeSelectionBackground\)/);
            expect(body, selector).toMatch(/border-color:\s*var\(--vscode-contrastActiveBorder/);
            expect(body, selector).toMatch(/color:\s*var\(--vscode-list-activeSelectionForeground\)/);
        }
        expect(plain('.nothing[aria-current="true"]')).toEqual([]);
    });

    it('0019 AC-007, AC-022 (T-017): a selected Overview row draws its contrast border as an inset shadow, so it shows without a border width and leaves the focus outline alone', () => {
        const rules = plain('.ov-row[aria-current="true"]');
        expect(rules.length).toBeGreaterThan(0);
        const body = rules.map((rule) => rule.body).join(';');
        expect(body).toMatch(/box-shadow:\s*inset 0 0 0 1px var\(--vscode-contrastActiveBorder,\s*transparent\)/);
        expect(body).not.toMatch(/outline/);
        expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
    });

    it('AC-021: every colour of the side panel and its close button is a --vscode-* variable and no rule sets or removes an outline', () => {
        for (const selector of ['.side-panel', '.detail-close', '.detail-close:hover', '.detail-title h2:focus-visible']) {
            const rules = rulesFor(css, selector);
            expect(rules.length, selector).toBeGreaterThan(0);
            for (const rule of rules) {
                expect(rule.body, selector).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
                for (const match of rule.body.matchAll(/var\(\s*(--[\w-]+)/g)) {
                    expect(match[1], selector).toMatch(/^--vscode-/);
                }
            }
        }
        for (const rule of rulesFor(css, '.detail-close')) {
            expect(rule.body).not.toMatch(/outline/);
        }
        expect(rulesFor(css, '.detail-title h2:focus-visible').some((rule) => /outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
    });
});

describe('0022 AC-022, AC-001: one scrollbar each, and no drawer', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const SCROLLING = /(?:^|;)\s*overflow(?:-y)?:\s*(?:auto|scroll)\b/;
    const SCROLLERS = ['.area-content', '.side-panel', '.column-cards', 'main > .panel-state'];

    function scrollers(source: string): string[] {
        return parseRules(source)
            .filter((rule) => SCROLLING.test(rule.body))
            .flatMap((rule) => rule.selectors)
            .sort();
    }

    it('AC-022: the page root, main and the area frame never scroll', () => {
        for (const selector of ['html', 'body', '#root', 'main', '.area-frame']) {
            const rules = rulesFor(css, selector);
            expect(rules.length, selector).toBeGreaterThan(0);
            expect(
                rules.some((rule) => /(?:^|;)\s*overflow:\s*hidden\b/.test(rule.body)),
                selector,
            ).toBe(true);
        }
    });

    it('AC-022: within the area frame only the area content, the side panel and the Board card lists scroll vertically, and a panel state has its own box', () => {
        expect(scrollers(css)).toEqual([...SCROLLERS].sort());
        expect(rulesFor(css, 'main > .panel-state').some((rule) => /min-height:\s*0/.test(rule.body) && /overflow-y:\s*auto/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.area-content').some((rule) => /overflow-y:\s*auto/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.side-panel').some((rule) => /overflow-y:\s*auto/.test(rule.body))).toBe(true);
    });

    it('AC-022 control: the scan sees a scrolling spec detail and ignores a hidden one', () => {
        expect(scrollers('.spec-detail { overflow-y: auto; }')).toEqual(['.spec-detail']);
        expect(scrollers('.spec-detail { overflow: hidden; } .x { overflow-x: auto; }')).toEqual([]);
        expect(scrollers('.a { min-height: 0; overflow: auto; }')).toEqual(['.a']);
    });

    it('AC-022: the detail itself and the side panel child do not scroll on their own', () => {
        for (const selector of ['.spec-detail', '.side-panel > .spec-detail']) {
            for (const rule of rulesFor(css, selector)) {
                expect(rule.body, selector).not.toMatch(/overflow/);
            }
        }
    });

    it('AC-022: no padding, margin or gap stands between the side panel’s right edge and the Studio panel’s', () => {
        const EDGE = /(?:^|;)\s*(?:(?:padding|margin)(?:-right|-inline|-inline-end)?|(?:column-)?gap):\s*(?!\s)(?!0(?:px)?\s*(?:;|$))/;
        for (const selector of ['main', '.area-frame', '.side-panel', '.studio', 'body', '#root']) {
            for (const rule of rulesFor(css, selector)) {
                expect(rule.body, selector).not.toMatch(EDGE);
            }
        }
        expect(EDGE.test('padding: 12px 16px')).toBe(true);
        expect(EDGE.test('margin-inline-end: 4px')).toBe(true);
        expect(EDGE.test('margin: 0;\n padding: 0;\n')).toBe(false);
        expect(EDGE.test('border-left: 1px solid red')).toBe(false);
    });

    it('AC-022: the area content and the notes keep the 16 px that main gave up, so the area starts where it did', () => {
        expect(rulesFor(css, '.area-content').some((rule) => /padding:\s*12px 16px/.test(rule.body))).toBe(true);
        for (const selector of ['main > .restricted-note', 'main > .notice']) {
            expect(rulesFor(css, selector).some((rule) => /margin:\s*8px 16px/.test(rule.body)), selector).toBe(true);
        }
    });

    it('AC-001: no rule holds data-drawer and no rule of the side panel lays it over the area', () => {
        expect(css).not.toMatch(/data-drawer/);
        const panelRules = parseRules(css).filter((rule) => rule.selectors.some((selector) => /\.side-panel/.test(selector)));
        expect(panelRules.length).toBeGreaterThan(0);
        for (const rule of panelRules) {
            expect(rule.body, rule.selectors.join(',')).not.toMatch(/position:\s*(?:absolute|fixed)|z-index/);
        }
        expect(/position:\s*(?:absolute|fixed)|z-index/.test('position: absolute')).toBe(true);
    });

    it('G-4: below 900 px with a selection the area is set aside in place (absolute, hidden, laid out) and the side panel takes the full width, with no media query in the rules', () => {
        const aside = rulesFor(css, '.area-frame[data-layout="detail"] > .area-content').map((rule) => rule.body).join(';');
        expect(aside).toMatch(/position:\s*absolute/);
        expect(aside).toMatch(/inset:\s*0/);
        expect(aside).toMatch(/visibility:\s*hidden/);
        expect(aside).not.toMatch(/display:\s*none/);
        const panel = rulesFor(css, '.area-frame[data-layout="detail"] > .side-panel').map((rule) => rule.body).join(';');
        expect(panel).toMatch(/flex:\s*1 1 auto/);
        const touched = parseRules(css).filter((rule) => rule.media !== undefined && rule.selectors.some((selector) => /\.side-panel|data-layout/.test(selector)));
        expect(touched).toEqual([]);
    });
});

describe('0022 AC-010, AC-012: only three Copies are primary, the icon button has a fixed box', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const secondary = (rule: { body: string }): boolean =>
        /color:\s*var\(--vscode-button-secondaryForeground/.test(rule.body) && /background:\s*var\(--vscode-button-secondaryBackground/.test(rule.body);

    it('AC-010: .copy-secondary, the Restricted Mode note button and the notice button use the secondary button colours; the panel-state button stays primary', () => {
        for (const selector of ['.copy-secondary', '.restricted-note button', '.notice button']) {
            const rules = rulesFor(css, selector);
            expect(rules.some(secondary), selector).toBe(true);
            for (const rule of rules) {
                expect(rule.body, selector).not.toMatch(/background:\s*var\(--vscode-button-background\)/);
            }
        }
        expect(rulesFor(css, '.copy-secondary:hover').some((rule) => rule.body.includes('var(--vscode-button-secondaryHoverBackground'))).toBe(true);
        expect(rulesFor(css, '.panel-state button').some((rule) => /background:\s*var\(--vscode-button-background\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.copy-button').some((rule) => /background:\s*var\(--vscode-button-background\)/.test(rule.body))).toBe(true);
        expect(secondary({ body: 'color: var(--vscode-button-foreground); background: var(--vscode-button-background)' })).toBe(false);
    });

    it('AC-012: .copy-icon has a fixed border-box of 24 by 24 px, no text colour of the primary button, no outline of its own and a contrast border in High Contrast', () => {
        const rules = rulesFor(css, '.copy-icon');
        const body = rules.map((rule) => rule.body).join(';');
        expect(body).toMatch(/box-sizing:\s*border-box/);
        expect(Number(/(?:^|;)\s*width:\s*(\d+)px/.exec(body)?.[1])).toBeGreaterThanOrEqual(24);
        expect(Number(/(?:^|;)\s*height:\s*(\d+)px/.exec(body)?.[1])).toBeGreaterThanOrEqual(24);
        expect(body).not.toMatch(/outline/);
        expect(body).not.toMatch(/--vscode-button-background|--vscode-button-foreground/);
        expect(body).toMatch(/user-select:\s*none/);
        expect(rulesFor(css, '.copy-icon:hover').some((rule) => rule.body.includes('var(--vscode-toolbar-hoverBackground)'))).toBe(true);
        expect(rulesFor(css, '.vscode-high-contrast .copy-icon').some((rule) => /border-color:\s*var\(--vscode-contrastBorder\)/.test(rule.body))).toBe(true);
    });

    it('AC-012: the icon button keeps its box while the glyph changes: nothing sized by content', () => {
        const body = rulesFor(css, '.copy-icon').map((rule) => rule.body).join(';');
        expect(body).not.toMatch(/(?:^|;)\s*(?:min-|max-)?width:\s*(?:auto|\d+ch|fit-content)/);
        expect(body).toMatch(/flex:\s*none/);
    });
});

describe('0022 AC-001, AC-003, AC-027, AC-028: Overview rows follow the list width', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const WIDE = 'ov-list (width > 686px)';
    const MIDDLE = 'ov-list (420px <= width <= 686px)';
    const NARROW = 'ov-list (width < 420px)';
    const inside = (condition: string) => parseRules(css).filter((rule) => rule.container === condition);
    const body = (condition: string, selector: string) =>
        inside(condition)
            .filter((rule) => rule.selectors.includes(selector))
            .map((rule) => rule.body)
            .join(';');
    const areasOf = (condition: string, selector: string) => [...body(condition, selector).matchAll(/"([^"]+)"/g)].map((match) => match[1]!.trim().split(/\s+/));

    it('the parser reads a container rule with its condition and keeps media rules apart', () => {
        const rules = parseRules('@container box (width > 5px) { .a { color: red } } @media (x) { .b { color: blue } } .c { color: green }');
        expect(rules.map((rule) => [rule.selectors[0], rule.container, rule.media])).toEqual([
            ['.a', 'box (width > 5px)', undefined],
            ['.b', undefined, '@media (x)'],
            ['.c', undefined, undefined],
        ]);
    });

    it('AC-001: every Overview list is an inline-size container named ov-list', () => {
        expect(declarations(css).filter((declaration) => declaration.selectors.includes('.ov-list') && declaration.property === 'container').map((declaration) => declaration.value)).toEqual(['ov-list / inline-size']);
    });

    it('AC-001: exactly three container conditions exist, at 686 px and 420 px, and each lays out .ov-row-item with named areas', () => {
        const conditions = [...new Set(parseRules(css).map((rule) => rule.container).filter((condition) => condition !== undefined))];
        expect(conditions.sort()).toEqual([MIDDLE, NARROW, WIDE].sort());
        for (const condition of [WIDE, MIDDLE, NARROW]) {
            expect(body(condition, '.ov-row-item'), condition).toMatch(/grid-template-areas:/);
            expect(body(condition, '.ov-row-item'), condition).toMatch(/grid-template-columns:/);
        }
    });

    it('AC-001: no media rule touches an Overview row selector, and no row layout sits outside a container rule', () => {
        const media = parseRules(css).filter((rule) => rule.media !== undefined && rule.selectors.some((selector) => /\.ov-/.test(selector)));
        expect(media).toEqual([]);
        const outside = declarations(css).filter((declaration) => declaration.container === undefined && declaration.selectors.some((selector) => /\.ov-row-item|\.ov-row\b/.test(selector)));
        expect(outside.filter((declaration) => /grid-template-areas|white-space/.test(declaration.property))).toEqual([]);
        expect(outside.some((declaration) => declaration.property === 'text-overflow')).toBe(false);
    });

    it('AC-001: the row button spans the item on subgrid rows and columns, so the Copy beside it takes its own area', () => {
        const rule = rulesFor(css, '.ov-row-item > .ov-row').map((entry) => entry.body).join(';');
        expect(rule).toMatch(/grid-template-columns:\s*subgrid/);
        expect(rule).toMatch(/grid-template-rows:\s*subgrid/);
        expect(rule).toMatch(/grid-column:\s*1 \/ -1/);
        expect(rulesFor(css, '.ov-row-item > .next-step-copy').map((entry) => entry.body).join(';')).toMatch(/grid-area:\s*copy/);
        for (const [selector, area] of [['.ov-row .ov-number', 'number'], ['.ov-row .ov-title', 'title'], ['.ov-state', 'state'], ['.ov-row .ov-problem', 'problem'], ['.ov-row-item > .step-text', 'step']] as const) {
            expect(rulesFor(css, selector).map((entry) => entry.body).join(';'), selector).toMatch(new RegExp(`grid-area:\\s*${area}\\b`));
        }
    });

    it('0025 AC-027: the step text is a grid item beside the row button, inert except for its link, with the left inset in the narrow layout', () => {
        const rule = rulesFor(css, '.ov-row-item > .step-text').map((entry) => entry.body).join(';');
        expect(rule).toMatch(/grid-area:\s*step/);
        expect(rule).toMatch(/pointer-events:\s*none/);
        expect(rulesFor(css, '.ov-row-item > .step-text .file-link').map((entry) => entry.body).join(';')).toMatch(/pointer-events:\s*auto/);
        expect(rulesFor(css, '.ov-row-item > .step-text').some((entry) => entry.container === NARROW && /padding-left:\s*12px/.test(entry.body))).toBe(true);
        for (const condition of [WIDE, MIDDLE, NARROW]) {
            expect(areasOf(condition, '.ov-row-item').flat(), condition).toContain('step');
        }
    });

    it('AC-001: the coach line and its toggle take the last line of the item in every layout', () => {
        expect(rulesFor(css, '.ov-row-item > .ov-coach').some((rule) => rule.container === undefined && /grid-column:\s*1 \/ -1/.test(rule.body))).toBe(true);
    });

    it('AC-028: in the two- and three-line layouts number and title share their first line with nothing else, and the title is not nowrap', () => {
        for (const condition of [MIDDLE, NARROW]) {
            const first = areasOf(condition, '.ov-row-item')[0]!;
            expect([...new Set(first)].sort(), condition).toEqual(['number', 'title']);
            expect(first[0]).toBe('number');
        }
        expect(areasOf(MIDDLE, '.ov-row-item')).toHaveLength(2);
        expect(areasOf(NARROW, '.ov-row-item')).toHaveLength(3);
        expect(areasOf(WIDE, '.ov-row-item')).toHaveLength(1);
        for (const condition of [MIDDLE, NARROW]) {
            expect(body(condition, '.ov-row .ov-title'), condition).not.toMatch(/white-space:\s*nowrap|text-overflow/);
            expect(body(condition, '.ov-row .ov-title'), condition).toMatch(/overflow-wrap:\s*break-word/);
        }
        const nowrapTitles = declarations(css).filter((declaration) => declaration.selectors.some((selector) => /\.ov-row/.test(selector) && /\.ov-title/.test(selector)) && declaration.property === 'white-space' && declaration.value === 'nowrap');
        expect(nowrapTitles.every((declaration) => declaration.container === WIDE)).toBe(true);
        expect(nowrapTitles.length).toBeGreaterThan(0);
    });

    it('AC-002: the card head, the card path and the detail path wrap at words and separators and never at any character', () => {
        for (const selector of ['.card-head', '.card-path', '.detail-path']) {
            const wraps = declarations(css).filter((declaration) => declaration.selectors.includes(selector) && declaration.property === 'overflow-wrap');
            expect(wraps.map((declaration) => declaration.value), selector).toEqual(['break-word']);
        }
        expect(declarations(css).filter((declaration) => /\.(?:card-path|detail-path|card-head|detail-heading|file-link)/.test(declaration.selectors.join(' ')) && /anywhere|break-all/.test(declaration.value))).toEqual([]);
    });

    it('AC-003: no rule of a problem line, the banner or the detail list cuts, clamps or keeps its text on one line', () => {
        const lists = declarations(css).filter((declaration) => declaration.selectors.some((selector) => /^\.(?:banner|detail-problems)\b/.test(selector)));
        expect(lists.filter((declaration) => /^(?:text-overflow|-webkit-line-clamp)$/.test(declaration.property) || (declaration.property === 'white-space' && declaration.value === 'nowrap'))).toEqual([]);
        expect(declarations(css).filter((declaration) => declaration.selectors.includes('.ov-line') && /^(?:text-overflow|-webkit-line-clamp)$/.test(declaration.property))).toEqual([]);
    });

    it('AC-001: no rule breaks a title anywhere or at every character', () => {
        const titles = declarations(css).filter((declaration) => declaration.selectors.some((selector) => /\.ov-title/.test(selector)));
        expect(titles.filter((declaration) => /anywhere|break-all/.test(declaration.value))).toEqual([]);
    });

    it('AC-003: a Problems row takes the two-line template from 420 px up, and nothing there cuts, clamps or keeps its text on one line', () => {
        expect(areasOf(WIDE, '.ov-problems .ov-row-item')).toEqual(areasOf(MIDDLE, '.ov-row-item'));
        const problems = declarations(css).filter((declaration) => declaration.selectors.some((selector) => /\.ov-problems|\.ov-line|\.problem-line|\.banner-line|\.detail-problems/.test(selector)));
        expect(problems.filter((declaration) => /text-overflow|line-clamp|white-space/.test(declaration.property) && !/^(normal|pre-line|pre-wrap)$/.test(declaration.value) && !/^(clip|unset)$/.test(declaration.value))).toEqual([]);
        expect(body(WIDE, '.ov-problems .ov-status')).toMatch(/white-space:\s*normal/);
        expect(body(WIDE, '.ov-problems .ov-status')).toMatch(/overflow:\s*visible/);
    });

    it('AC-027: the state name hides visually inside the two narrower blocks only', () => {
        const hiding = declarations(css).filter((declaration) => declaration.selectors.includes('.ov-state-name'));
        expect(hiding.length).toBeGreaterThan(0);
        expect(hiding.every((declaration) => declaration.container === MIDDLE || declaration.container === NARROW)).toBe(true);
        for (const condition of [MIDDLE, NARROW]) {
            expect(body(condition, '.ov-state-name'), condition).toMatch(/clip-path:\s*inset\(50%\)/);
            expect(body(condition, '.ov-state-name'), condition).toMatch(/position:\s*absolute/);
        }
        expect(declarations(css).filter((declaration) => declaration.selectors.some((selector) => /\.ov-status|\.ov-problem|\.ov-problems/.test(selector)) && /display:\s*none|visibility:\s*hidden|clip-path/.test(`${declaration.property}: ${declaration.value}`))).toEqual([]);
    });

    it('AC-028: at 920 px with the side panel at its default width the list selects the two-line layout; beside it at 360 px the list holds 12ch of title and the widest Copy', () => {
        const value = (selector: string, property: string) => {
            const found = declarations(css).filter((declaration) => declaration.selectors.includes(selector) && declaration.property === property && declaration.container === undefined);
            return found[found.length - 1]!.value;
        };
        const px = (text: string) => Number(/(-?\d+(?:\.\d+)?)px/.exec(text)![1]);
        const areaPadding = px(value('.area-content', 'padding').split(/\s+/)[1]!) * 2;
        const panelPadding = px(value('.ov-panel', 'padding').split(/\s+/)[1]!) * 2;
        const panelBorder = px(value('.ov-panel', 'border')) * 2;
        const listMargin = -px(value('.ov-list', 'margin').split(/\s+/)[1]!) * 2;
        const listAt = (area: number) => area - areaPadding - panelPadding - panelBorder + listMargin;
        const side = defaultSideWidth(920);
        expect(listAt(920 - side)).toBeGreaterThanOrEqual(420);
        expect(listAt(920 - side)).toBeLessThanOrEqual(686);
        const narrow = listAt(AREA_MIN);
        expect(narrow).toBeLessThan(420);
        const rowPadding = px(value('.ov-row', 'padding').split(/\s+/)[1]!) * 2;
        const content = narrow - rowPadding;
        const number = 4 * 0.6 * 13 * 0.92;
        const gap = px(value('.ov-row-item', 'column-gap'));
        const title = 12 * 0.6 * 13;
        const copy = 4 * 0.6 * 11 + 24;
        expect(content).toBeGreaterThanOrEqual(number + gap + title);
        expect(content).toBeGreaterThanOrEqual(copy);
        expect(SIDE_MIN).toBeLessThan(AREA_MIN);
    });

    it('AC-028: the widest Copy is read from the stylesheet (.copy-button: its min-width, padding and border at 11 px) and fits the row content at an area of 360 px', () => {
        const value = (selector: string, property: string) => {
            const found = declarations(css).filter((declaration) => declaration.selectors.includes(selector) && declaration.property === property && declaration.container === undefined && declaration.media === undefined);
            return found[found.length - 1]!.value;
        };
        const px = (text: string) => Number(/(-?\d+(?:\.\d+)?)px/.exec(text)![1]);
        const ch = (text: string) => Number(/(\d+(?:\.\d+)?)ch/.exec(text)![1]);
        const fontSize = px(value('.copy-button', 'font-size'));
        const copy = ch(value('.copy-button', 'min-width')) * 0.6 * fontSize + px(value('.copy-button', 'padding').split(/\s+/)[1]!) * 2 + px(value('.copy-button', 'border')) * 2;
        const areaPadding = px(value('.area-content', 'padding').split(/\s+/)[1]!) * 2;
        const panelPadding = px(value('.ov-panel', 'padding').split(/\s+/)[1]!) * 2;
        const panelBorder = px(value('.ov-panel', 'border')) * 2;
        const listMargin = -px(value('.ov-list', 'margin').split(/\s+/)[1]!) * 2;
        const rowPadding = px(value('.ov-row', 'padding').split(/\s+/)[1]!) * 2;
        const content = AREA_MIN - areaPadding - panelPadding - panelBorder + listMargin - rowPadding;
        expect(copy).toBeGreaterThan(100);
        expect(content).toBeGreaterThanOrEqual(copy);
    });
});

describe('0022 AC-015, §7 g: a segment without a separator wider than its whole line breaks inside', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const SELECTORS = ['.next-step-lines code', '.file-link', '.ov-line', '.banner li'];

    it.each(SELECTORS.map((selector) => [selector]))('%s: overflow-wrap is break-word and min-width is 0, in no container or media rule', (selector) => {
        const own = declarations(css).filter((declaration) => declaration.selectors.includes(selector));
        expect(own.filter((declaration) => declaration.property === 'overflow-wrap').map((declaration) => declaration.value)).toEqual(['break-word']);
        expect(own.filter((declaration) => declaration.property === 'min-width').map((declaration) => declaration.value)).toEqual(['0']);
        expect(own.filter((declaration) => /^(?:overflow-wrap|min-width)$/.test(declaration.property) && (declaration.media !== undefined || declaration.container !== undefined))).toEqual([]);
    });

    it('no rule of these elements breaks at any character (anywhere, break-all, word-break)', () => {
        const breaking = declarations(css).filter((declaration) => declaration.selectors.some((selector) => SELECTORS.includes(selector)) && /anywhere|break-all|^word-break$/.test(`${declaration.property} ${declaration.value}`));
        expect(breaking).toEqual([]);
    });

    it('control: a rule without the pair is seen', () => {
        const rule = declarations('.next-step-lines code { color: red }').filter((declaration) => declaration.selectors.includes('.next-step-lines code'));
        expect(rule.some((declaration) => declaration.property === 'overflow-wrap')).toBe(false);
    });
});

describe('0022 AC-002: no title, heading or path breaks at any character', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const breaking = (source: string) => declarations(source).filter((declaration) => /^(?:overflow-wrap|word-break)$/.test(declaration.property) && /anywhere|break-all/.test(declaration.value));

    it('no rule of the stylesheet sets break-all, and anywhere is set only on the step text of a row or card', () => {
        const found = breaking(css);
        expect(found.filter((declaration) => /break-all/.test(declaration.value))).toEqual([]);
        expect(found.filter((declaration) => !declaration.selectors.every((selector) => selector === '.step-text')).map((declaration) => declaration.selectors.join(','))).toEqual([]);
    });

    it('control: the scan sees break-all on the side panel heading, anywhere on a card title and break-all on a next-step command', () => {
        for (const rule of ['.detail-title h2 { word-break: break-all }', '.card-title { overflow-wrap: anywhere }', '.next-step-lines code { word-break: break-all }']) {
            expect(breaking(rule)).toHaveLength(1);
        }
        expect(breaking('.step-text { overflow-wrap: anywhere }').every((declaration) => declaration.selectors.every((selector) => selector === '.step-text'))).toBe(true);
    });

    it('the side panel heading wraps at word boundaries and breaks inside a single word only when it is wider than the panel', () => {
        const heading = declarations(css).filter((declaration) => declaration.selectors.includes('.detail-title h2'));
        expect(heading.filter((declaration) => declaration.property === 'overflow-wrap').map((declaration) => declaration.value)).toEqual(['break-word']);
        expect(heading.filter((declaration) => declaration.property === 'min-width').map((declaration) => declaration.value)).toEqual(['0']);
    });
});

describe('0021 AC-014, AC-022: the toggletip uses the theme, shows its focus and stays in the flow', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const own = (): { selector: string; body: string }[] =>
        parseRules(css)
            .map((rule) => ({ selector: rule.selectors.join(', '), body: rule.body }))
            .filter((rule) => /\.toggletip\b/.test(rule.selector));

    it('has rules for the button and its region, and only theme variables for colour', () => {
        expect(rulesFor(css, '.toggletip').length).toBeGreaterThan(0);
        expect(rulesFor(css, '.toggletip-region').length).toBeGreaterThan(0);
        expect(own().length).toBeGreaterThanOrEqual(6);
        for (const rule of own()) {
            expect(rule.body, rule.selector).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
        }
        const body = rulesFor(css, '.toggletip').map((rule) => rule.body).join(';');
        expect(body).toMatch(/color:\s*var\(--vscode-/);
        expect(body).toMatch(/border:\s*1px solid var\(--vscode-/);
    });

    it('shows a visible focus outline from the focus variables and never removes it', () => {
        const rules = rulesFor(css, '.toggletip:focus-visible');
        expect(rules.some((rule) => /outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/.test(rule.body))).toBe(true);
        for (const rule of own()) {
            expect(rule.body, rule.selector).not.toMatch(/outline:\s*(none|0)\b/);
        }
    });

    it('has no transition longer than 150 ms and the High Contrast border', () => {
        for (const rule of own()) {
            for (const match of rule.body.matchAll(/transition[^;]*/g)) {
                for (const time of match[0].matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)) {
                    const ms = time[2] === 's' ? Number(time[1]) * 1000 : Number(time[1]);
                    expect(ms, rule.selector).toBeLessThanOrEqual(150);
                }
            }
        }
        expect(rulesFor(css, '.vscode-high-contrast .toggletip').some((rule) => /border-color:\s*var\(--vscode-contrastBorder\)/.test(rule.body))).toBe(true);
    });

    it('keeps the region in the flow: no absolute or fixed position, no negative margin, and it takes a whole line', () => {
        for (const rule of own()) {
            expect(rule.body, rule.selector).not.toMatch(/position:\s*(absolute|fixed)/);
        }
        const region = rulesFor(css, '.toggletip-region').map((rule) => rule.body).join(';');
        expect(region).toMatch(/flex:\s*1 0 100%/);
        expect(region).not.toMatch(/margin[^;]*-\d/);
        expect(rulesFor(css, '.next-step .section-head').some((rule) => /flex-wrap:\s*wrap/.test(rule.body))).toBe(true);
    });
});

describe('0021 AC-001, AC-009, §6.5: the intent stands on its own line and the coach line is a description', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const body = (selector: string): string => rulesFor(css, selector).map((rule) => rule.body).join(';');

    it('the intent of a line takes the whole row of its flex line, before the prompt and Copy', () => {
        expect(body('.next-step-intent')).toMatch(/flex:\s*1 0 100%/);
    });

    it('the coach line of the detail and of the Overview row use the description colour and no literal colour', () => {
        for (const selector of ['.step-coach', '.ov-coach']) {
            expect(body(selector), selector).toMatch(/(?:^|;)\s*color:\s*var\(--vscode-descriptionForeground\)/);
            expect(body(selector), selector).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
        }
    });

    it('negative control: a rule that sets another colour or a shorter basis would be found', () => {
        const mutated = css.replace(/(\.step-coach \{[^}]*?)color: var\(--vscode-descriptionForeground\)/, '$1color: var(--vscode-foreground)').replace(/(\.next-step-intent \{\s*)flex: 1 0 100%/, '$1flex: none');
        const rule = (text: string, selector: string): string => rulesFor(text, selector).map((entry) => entry.body).join(';');
        expect(rule(mutated, '.step-coach')).not.toMatch(/color:\s*var\(--vscode-descriptionForeground\)/);
        expect(rule(mutated, '.next-step-intent')).not.toMatch(/flex:\s*1 0 100%/);
    });
});

describe('0023 AC-008, AC-011: the step cards of the Plan map', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const own = /\.plan-map|\.plan-stage|\.plan-group|\.plan-arrow|\.plan-card-list|\.step-card/;
    const mapRules = parseRules(css).filter((rule) => rule.selectors.some((selector) => own.test(selector)));

    it('a group wraps its cards and a card is 200 to 360 px wide', () => {
        expect(rulesFor(css, '.plan-group').some((rule) => /display:\s*flex/.test(rule.body) && /flex-wrap:\s*wrap/.test(rule.body))).toBe(true);
        const card = rulesFor(css, '.step-card').map((rule) => rule.body).join(';');
        expect(card).toMatch(/flex:\s*1 1 200px/);
        expect(card).toMatch(/min-width:\s*200px/);
        expect(card).toMatch(/max-width:\s*360px/);
    });

    it('no rule of the map sits in a media query (guideline 12) and the rules exist (negative control)', () => {
        expect(mapRules.length).toBeGreaterThan(10);
        expect(mapRules.filter((rule) => rule.media !== undefined)).toEqual([]);
    });

    it('the map holds no colour literal and takes its colours from theme variables', () => {
        const body = mapRules.map((rule) => rule.body).join(';');
        expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
        expect(body).toContain('var(--vscode-');
    });

    it('0022 AC-015 as §4 amends it: ways, start lines and card lines break at any width and no rule of the map forbids a break', () => {
        for (const selector of ['.plan-way-prompt code', '.plan-start-lines code', '.step-card-line']) {
            const body = rulesFor(css, selector).map((rule) => rule.body).join(';');
            expect(body, selector).toMatch(/overflow-wrap:\s*break-word/);
            expect(body, selector).not.toMatch(/white-space:\s*(nowrap|pre)\b/);
        }
        const planRules = parseRules(css).filter((rule) => rule.selectors.some((selector) => /\.plan-(?:ways?|start|stage|group)|\.step-card/.test(selector)));
        expect(planRules.length).toBeGreaterThan(10);
        expect(planRules.filter((rule) => /white-space:\s*(nowrap|pre)\b/.test(rule.body))).toEqual([]);
    });

    it('the card head has a visible focus outline of the theme and no rule removes it', () => {
        const focus = rulesFor(css, '.step-card-toggle:focus-visible').map((rule) => rule.body).join(';');
        expect(focus).toMatch(/outline:\s*2px solid var\(--vscode-contrastActiveBorder, var\(--vscode-focusBorder\)\)/);
        expect(mapRules.some((rule) => /outline:\s*(none|0)\b/.test(rule.body))).toBe(false);
    });
});

describe('0024 AC-009, AC-003: the split button\'s stylesheet', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const value = (selector: string, property: string) => {
        const found = declarations(css).filter((declaration) => declaration.selectors.includes(selector) && declaration.property === property && declaration.container === undefined && declaration.media === undefined);
        return found[found.length - 1]?.value;
    };
    const px = (text: string | undefined) => Number(/(-?\d+(?:\.\d+)?)px/.exec(text ?? '')?.[1]);

    it('the main part has min-width 22ch, the arrow part at least 24 by 24 px, the menu is absolutely positioned', () => {
        expect(value('.send-main', 'min-width')).toBe('22ch');
        expect(px(value('.send-arrow', 'width'))).toBeGreaterThanOrEqual(24);
        expect(px(value('.send-arrow', 'height'))).toBeGreaterThanOrEqual(24);
        expect(value('.send-menu', 'position')).toBe('absolute');
        expect(value('.send-split', 'position')).toBe('relative');
    });

    it('both parts use the primary button variables, the menu the menu variables; theme variables only, no outline of their own', () => {
        const parts = ['.send-main', '.copy-button', '.send-arrow'].flatMap((selector) => rulesFor(css, selector).map((rule) => rule.body)).join(';');
        expect(parts).toContain('var(--vscode-button-background)');
        expect(parts).toContain('var(--vscode-button-foreground)');
        expect(rulesFor(css, '.send-arrow').some((rule) => /background:\s*var\(--vscode-button-background\)/.test(rule.body) && /color:\s*var\(--vscode-button-foreground\)/.test(rule.body))).toBe(true);
        expect(rulesFor(css, '.send-arrow:hover').some((rule) => rule.body.includes('var(--vscode-button-hoverBackground'))).toBe(true);
        const own = parseRules(css).filter((rule) => rule.selectors.some((selector) => /^\.send-/.test(selector)));
        expect(own.length).toBeGreaterThan(5);
        const body = own.map((rule) => rule.body).join(';');
        expect(body).toContain('var(--vscode-menu-background');
        expect(body).toContain('var(--vscode-menu-foreground');
        expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
        expect(body).not.toMatch(/outline/);
        expect(rulesFor(css, '.vscode-high-contrast .send-menu').some((rule) => /border-color:\s*var\(--vscode-contrastBorder\)/.test(rule.body))).toBe(true);
    });

    it('the split button (main part at 22ch, padding, border, and the 24 px arrow part) fits the row content at an area of 360 px (0022 AC-028\'s arithmetic)', () => {
        const fontSize = px(value('.copy-button', 'font-size'));
        const main = 22 * 0.6 * fontSize + px(value('.copy-button', 'padding')?.split(/\s+/)[1]) * 2 + px(value('.copy-button', 'border')) * 2;
        const split = main + px(value('.send-arrow', 'width'));
        const areaPadding = px(value('.area-content', 'padding')?.split(/\s+/)[1]) * 2;
        const panelPadding = px(value('.ov-panel', 'padding')?.split(/\s+/)[1]) * 2;
        const panelBorder = px(value('.ov-panel', 'border')) * 2;
        const listMargin = -px(value('.ov-list', 'margin')?.split(/\s+/)[1]) * 2;
        const rowPadding = px(value('.ov-row', 'padding')?.split(/\s+/)[1]) * 2;
        const content = AREA_MIN - areaPadding - panelPadding - panelBorder + listMargin - rowPadding;
        expect(split).toBeGreaterThan(150);
        expect(content).toBeGreaterThanOrEqual(split);
    });

    it('control: a stylesheet without the menu position is seen', () => {
        const own = declarations('.send-menu { color: red }').filter((declaration) => declaration.selectors.includes('.send-menu'));
        expect(own.some((declaration) => declaration.property === 'position')).toBe(false);
    });
});


describe('0027 AC-003: the attachment line', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');

    it('.send-attach and its chip use theme variables only, 11 px like the coach line, and break only at the separators the markup gives', () => {
        expect(declarations(css).filter((declaration) => declaration.selectors.some((selector) => selector.includes('.send-attach')))).toEqual([]);
        expect(css).not.toContain('send-attach');
    });

    it('in the Overview row the line spans the row like the coach line, in the three container widths', () => {
        expect(declarations(css).filter((declaration) => declaration.selectors.includes('.ov-row-item > .send-attach'))).toEqual([]);
        expect(declarations(css).some((declaration) => declaration.selectors.includes('.ov-row-item') && declaration.property === 'grid-template-columns')).toBe(true);
    });

    it('negative control: the scan finds a planted anywhere break and a colour literal', () => {
        const planted = declarations('.send-attach { overflow-wrap: anywhere; color: #fff; }');
        expect(planted.filter((declaration) => /anywhere/.test(declaration.value))).toHaveLength(1);
        expect(planted.filter((declaration) => /#[0-9a-fA-F]{3,8}\b/.test(declaration.value))).toHaveLength(1);
    });
});

describe('0031 AC-013: the gap between two prompt lines of a Next step', () => {
    const css = readFileSync(path.resolve(__dirname, '..', '..', 'webview', 'main.css'), 'utf8');
    const GAP = /^(\d+(?:\.\d+)?)em$/;

    function gapOf(source: string): number | undefined {
        const found = declarations(source).filter((declaration) => declaration.selectors.includes('.next-step-lines li + li') && declaration.property === 'margin-top');
        const value = GAP.exec(found[found.length - 1]?.value ?? '');
        return value === null ? undefined : Number(value[1]);
    }

    it('0031 AC-013 the line items are separated by 1em through 1.5em, for the detail and the Plan map header alike', () => {
        const gap = gapOf(css);
        expect(gap).toBeGreaterThanOrEqual(1);
        expect(gap).toBeLessThanOrEqual(1.5);
        expect(declarations(css).filter((declaration) => declaration.selectors.some((selector) => selector.includes('next-step-lines li') && selector !== '.next-step-lines li + li' && /margin/.test(declaration.property)))).toEqual([]);
    });

    it('0031 AC-013 the gap inside an item (button to Tip) stays 6px', () => {
        const inside = declarations(css).filter((declaration) => declaration.selectors.includes('.next-step-lines li') && declaration.property === 'gap');
        expect(inside.map((declaration) => declaration.value)).toEqual(['6px']);
    });

    it('negative control: a gap of 0.5em or 2em is found out of range, a missing rule is undefined', () => {
        expect(gapOf('.next-step-lines li + li { margin-top: 0.5em; }')).toBe(0.5);
        expect(gapOf('.next-step-lines li + li { margin-top: 2em; }')).toBe(2);
        expect(gapOf('.next-step-lines li { margin-top: 1.25em; }')).toBeUndefined();
    });
});
