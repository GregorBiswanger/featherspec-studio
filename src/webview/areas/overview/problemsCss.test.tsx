import { afterEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewProblems } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import mainCss from '../../main.css?raw';
import { baseView, mount, overviewEvent, send, shellEvent, type Mounted } from '../../testing/dom';
import { effectiveValue, rulesMatching, type CssRule } from '../../testing/css';

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

async function open(): Promise<HTMLElement> {
    const posted: Envelope[] = [];
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    const view = sampleView();
    view.now = [{ spec: { stem: '0001-a', number: '0001', title: PROBLEMS.rows[0]!.spec.title, found: true }, state: 'Active', status: 'Active', problems: 0 }];
    view.now[0]!.step = { short: '/sdd-plan', line: '/sdd-plan 0001', lines: [{ text: '/sdd-plan 0001' }] };
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
        expect(effectiveValue(rules, problem, 'white-space')).not.toBe('nowrap');
        expect(effectiveValue(rules, problem, 'text-overflow')).not.toBe('ellipsis');
        expect(effectiveValue(rules, problem, 'overflow')).not.toBe('hidden');
    });

    it('control: the same check sees the cut on the title of a Now row, which stays on one line in the wide container', async () => {
        const { now } = await titles();
        const rules = rulesMatching(css, now).filter((rule) => rule.container === WIDE || rule.container === undefined);
        expect(effectiveValue(rules, now, 'white-space')).toBe('nowrap');
        expect(effectiveValue(rules, now, 'text-overflow')).toBe('ellipsis');
        expect(effectiveValue(rules, now, 'overflow')).toBe('hidden');
    });

    it('the effective-value helper takes the more specific rule, then the later one', () => {
        const element = document.createElement('p');
        element.className = 'a b';
        const rules: CssRule[] = [
            { selectors: ['.a'], body: 'color: red' },
            { selectors: ['.a.b'], body: 'color: blue' },
            { selectors: ['.a'], body: 'color: green' },
        ];
        expect(effectiveValue(rules, element, 'color')).toBe('blue');
    });
});

describe('0022 AC-001, §4.1: the step and its Copy are never cut in any container width', () => {
    const CONTAINERS = [WIDE, 'ov-list (420px <= width <= 686px)', 'ov-list (width < 420px)'];
    const CUTTING = [
        ['white-space', 'nowrap'],
        ['text-overflow', 'ellipsis'],
        ['overflow', 'hidden'],
    ] as const;

    async function parts(): Promise<{ step: Element; copy: Element }> {
        const container = await open();
        const item = container.querySelector('.ov-now .ov-row-item')!;
        return { step: item.querySelector('.step-text')!, copy: item.querySelector('.next-step-copy')! };
    }

    it.each(CONTAINERS.map((container) => [container]))('inside %s no rule that matches the step text or the Copy cuts, clamps or keeps it on one line', async (container) => {
        const { step, copy } = await parts();
        for (const element of [step, copy]) {
            const rules = rulesMatching(css, element).filter((rule) => rule.container === container || rule.container === undefined);
            for (const [property, cutting] of CUTTING) {
                expect(effectiveValue(rules, element, property), `${element.className} ${property}`).not.toBe(cutting);
            }
        }
    });

    it('control: the same check sees the cut on the title of a Now row in the wide container', async () => {
        const container = await open();
        const title = container.querySelector('.ov-now .ov-row .ov-title')!;
        const rules = rulesMatching(css, title).filter((rule) => rule.container === WIDE || rule.container === undefined);
        expect(CUTTING.some(([property, cutting]) => effectiveValue(rules, title, property) === cutting)).toBe(true);
    });
});
