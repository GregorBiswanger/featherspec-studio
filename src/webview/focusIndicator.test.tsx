import { afterEach, describe, expect, it } from 'vitest';
import type { ShellView, SpecRow } from '../shared/protocol/messages';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import mainCss from './main.css?raw';
import { parseRules, type CssRule } from './testing/css';
import { baseView, mount, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

async function open(view: ShellView): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(view, 1));
    return mounted.container;
}

function focusables(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>('button, [tabindex]')].filter((element) => element.tabIndex >= 0);
}

function focusRulesFor(css: string, element: Element): CssRule[] {
    return parseRules(css).filter((rule) =>
        rule.selectors.some((selector) => {
            if (!selector.includes(':focus-visible')) {
                return false;
            }
            try {
                return element.matches(selector.replace(/:focus-visible/g, ''));
            } catch {
                return false;
            }
        }),
    );
}

function hasVisibleThemeOutline(rule: CssRule): boolean {
    return /outline:\s*[1-9]\d*px\s+solid\s+var\(--vscode-/.test(rule.body);
}

const ROWS: SpecRow[] = [
    { stem: '0001-a', path: '.specs/active/0001-a.md', number: '0001', title: 'A', state: 'Active', derivedRule: undefined, showPath: false, selected: false },
    { stem: '0002-b', path: '.specs/active/0002-b.md', number: '0002', title: 'B', state: 'Review', derivedRule: 'S-REVIEW', showPath: false, selected: true },
];

describe('AC-022: the focus indicator', () => {
    it('every navigation item, list row, notice action and note action is reached by a :focus-visible rule with a visible outline in a theme colour', async () => {
        const css = mainCss as string;
        const container = await open(baseView({ area: 'specExplorer', rows: ROWS, selection: { stem: '0002-b', number: '0002' }, notice: { number: '0003' }, restricted: true }));
        const elements = focusables(container);
        expect(elements.length).toBeGreaterThanOrEqual(4 + ROWS.length + 2);
        const missing = elements.filter((element) => !focusRulesFor(css, element).some(hasVisibleThemeOutline)).map((element) => element.outerHTML.slice(0, 80));
        expect(missing).toEqual([]);
    });

    it('every state action is reached by a :focus-visible rule with a visible outline in a theme colour', async () => {
        const css = mainCss as string;
        for (const state of [{ id: 'S1' }, { id: 'S2' }, { id: 'S3' }] as const) {
            const container = await open(baseView({ state }));
            const actions = [...container.querySelectorAll<HTMLElement>('[role="status"] button, .panel-state button')];
            expect(actions.length).toBeGreaterThan(0);
            for (const action of actions) {
                expect(focusRulesFor(css, action).some(hasVisibleThemeOutline), action.textContent ?? '').toBe(true);
            }
            clients.splice(0).forEach((client) => client.stop());
            mounted?.unmount();
            mounted = undefined;
        }
    });

    it('negative control: a stylesheet without the generic focus rule leaves a navigation item without an indicator', async () => {
        const stripped = (mainCss as string).replace(/button:focus-visible,\s*\[role="option"\]:focus-visible\s*\{[^}]*\}/, '');
        const container = await open(baseView({ area: 'specExplorer', rows: ROWS }));
        const item = container.querySelector('nav button')!;
        expect(focusRulesFor(stripped, item).some(hasVisibleThemeOutline)).toBe(false);
    });
});
