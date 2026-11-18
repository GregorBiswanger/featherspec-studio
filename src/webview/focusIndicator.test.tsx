import { afterEach, describe, expect, it } from 'vitest';
import type { ShellView, SpecRow } from '../shared/protocol/messages';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import mainCss from './main.css?raw';
import { parseRules, type CssRule } from './testing/css';
import { boardEvent, boardView, card } from './board/testing/views';
import { detailEvent, detailView } from './detail/testing/views';
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

describe('AC-022: the focus indicator', () => {
    it('every navigation item, notice action and note action is reached by a :focus-visible rule with a visible outline in a theme colour', async () => {
        const css = mainCss as string;
        const container = await open(baseView({ area: 'overview', notice: { number: '0003' }, restricted: true }));
        const elements = focusables(container);
        expect(elements.length).toBeGreaterThanOrEqual(2 + 2);
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
        const container = await open(baseView({ area: 'overview' }));
        const item = container.querySelector('nav button')!;
        expect(focusRulesFor(stripped, item).some(hasVisibleThemeOutline)).toBe(false);
    });
});

describe('0019 AC-021: the focus indicator inside the side panel', () => {
    it('the close button, Copy, every link and every toggle of the side panel are reached by a :focus-visible rule with a visible outline in a theme colour, and so is the heading', async () => {
        const css = mainCss as string;
        const container = await open(baseView({ area: 'board', selection: { stem: '0007-thing', number: '0007' } }));
        await send(boardEvent(boardView([card('0007')])));
        await send(detailEvent(detailView()));
        const panel = container.querySelector<HTMLElement>('aside.side-panel')!;
        const controls = focusables(panel);
        for (const selector of ['.detail-close', '.copy-button, .next-step-copy', '.file-link', 'h3 > button']) {
            expect(controls.some((element) => element.matches(selector)), selector).toBe(true);
        }
        const missing = controls.map((element) => element).filter((element) => !focusRulesFor(css, element).some(hasVisibleThemeOutline)).map((element) => element.outerHTML.slice(0, 80));
        expect(missing).toEqual([]);
        const heading = panel.querySelector('[data-detail-heading]')!;
        expect(focusRulesFor(css, heading).some(hasVisibleThemeOutline)).toBe(true);
    });
});
