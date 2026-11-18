import { afterEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewProblems } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import mainCss from '../../main.css?raw';
import { baseView, mount, overviewEvent, send, shellEvent, type Mounted } from '../../testing/dom';
import { rulesMatching, type CssRule } from '../../testing/css';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const WIDE = 'ov-list (width > 686px)';
const css = mainCss as string;

const PROBLEMS: OverviewProblems = {
    rows: [
        {
            spec: { stem: '0002-x', number: '0002', title: 'A very long title of a spec that has a Problem and must be read to its last word', found: true },
            state: 'Backlog',
            status: 'The plan link of the spec leads nowhere',
            problems: 1,
        },
    ],
    lines: [],
};

function specificity(selector: string): number {
    return (selector.match(/[.[:#]/g) ?? []).length;
}

function effective(rules: CssRule[], element: Element, property: string): string | undefined {
    let winner: { weight: number; order: number; value: string } | undefined;
    rules.forEach((rule, order) => {
        const weight = Math.max(...rule.selectors.filter((selector) => element.matches(selector)).map(specificity), -1);
        if (weight < 0) {
            return;
        }
        const declaration = rule.body
            .split(';')
            .map((part) => part.trim())
            .filter((part) => part.startsWith(`${property}:`))
            .pop();
        if (declaration === undefined) {
            return;
        }
        if (winner === undefined || weight > winner.weight || (weight === winner.weight && order >= winner.order)) {
            winner = { weight, order, value: declaration.slice(property.length + 1).trim() };
        }
    });
    return winner?.value;
}

async function open(): Promise<HTMLElement> {
    const posted: Envelope[] = [];
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    const view = sampleView();
    view.now = [{ spec: { stem: '0001-a', number: '0001', title: PROBLEMS.rows[0]!.spec.title, found: true }, state: 'Active', status: 'Active', problems: 0 }];
    view.problems = PROBLEMS;
    await send(overviewEvent(view));
    return mounted.container;
}

describe('0022 AC-003: a Problems row title is never cut at any width', () => {
    async function titles(): Promise<{ problem: Element; now: Element }> {
        const container = await open();
        return { problem: container.querySelector('.ov-problems .ov-row .ov-title')!, now: container.querySelector('.ov-now .ov-row .ov-title')! };
    }

    it('in the wide container no rule that matches a Problems row title cuts it: no ellipsis, no nowrap, no hidden overflow', async () => {
        const { problem } = await titles();
        const rules = rulesMatching(css, problem).filter((rule) => rule.container === WIDE || rule.container === undefined);
        expect(rules.some((rule) => rule.container === WIDE)).toBe(true);
        expect(effective(rules, problem, 'white-space')).not.toBe('nowrap');
        expect(effective(rules, problem, 'text-overflow')).not.toBe('ellipsis');
        expect(effective(rules, problem, 'overflow')).not.toBe('hidden');
    });

    it('control: the same check sees the cut on the title of a Now row, which stays on one line in the wide container', async () => {
        const { now } = await titles();
        const rules = rulesMatching(css, now).filter((rule) => rule.container === WIDE || rule.container === undefined);
        expect(effective(rules, now, 'white-space')).toBe('nowrap');
        expect(effective(rules, now, 'text-overflow')).toBe('ellipsis');
        expect(effective(rules, now, 'overflow')).toBe('hidden');
    });

    it('the effective-value helper takes the more specific rule, then the later one', () => {
        const element = document.createElement('p');
        element.className = 'a b';
        const rules: CssRule[] = [
            { selectors: ['.a'], body: 'color: red' },
            { selectors: ['.a.b'], body: 'color: blue' },
            { selectors: ['.a'], body: 'color: green' },
        ];
        expect(effective(rules, element, 'color')).toBe('blue');
    });
});
