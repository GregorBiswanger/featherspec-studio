import { afterEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewRow, OverviewView } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import mainCss from '../../main.css?raw';
import { baseView, mount, overviewEvent, send, shellEvent, type Mounted } from '../../testing/dom';
import { effectiveValue, rulesMatching } from '../../testing/css';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const css = mainCss as string;

const TINTS: Record<OverviewRow['state'], string> = {
    Active: 'var(--vscode-charts-green)',
    Review: 'var(--vscode-charts-orange)',
    Blocked: 'var(--vscode-charts-red)',
    Ready: 'var(--vscode-charts-blue)',
    Backlog: 'var(--vscode-descriptionForeground)',
    Done: 'var(--vscode-descriptionForeground)',
};

function row(number: string, state: OverviewRow['state']): OverviewRow {
    return { spec: { stem: `${number}-x`, number, title: `Title ${number}`, found: true }, state, status: state, problems: 0 };
}

async function open(): Promise<HTMLElement> {
    const posted: Envelope[] = [];
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    const view: OverviewView = sampleView();
    view.now = { rows: [row('0001', 'Active'), row('0002', 'Review'), row('0003', 'Blocked')], more: 0, stems: [] };
    view.upNext = { rows: [row('0004', 'Ready'), row('0005', 'Backlog')], more: 0, stems: ['0004-x', '0005-x'] };
    view.problems = { rows: [row('0006', 'Done'), row('0007', 'Review')], lines: [] };
    await send(overviewEvent(view));
    return mounted.container;
}

describe('0022 AC-026, §4.8: the state icon of an Overview row carries the colour of its state', () => {
    it.each(Object.entries(TINTS))('%s: the icon in Now, Up next and Problems takes color from --fs-tint, and --fs-tint is %s', async (state, variable) => {
        const container = await open();
        const icons = [...container.querySelectorAll<Element>('.ov-row-item')].filter((item) => item.querySelector('.ov-row')?.getAttribute('data-board-state') === state).map((item) => item.querySelector('.ov-state-icon .icon')!);
        expect(icons.length).toBeGreaterThan(0);
        for (const icon of icons) {
            const rules = rulesMatching(css, icon);
            expect(effectiveValue(rules, icon, 'color'), `${state} color`).toBe('var(--fs-tint)');
            expect(effectiveValue(rules, icon, '--fs-tint'), `${state} --fs-tint`).toBe(variable);
        }
    });

    it('control: the named hook that carries the colour is the table, so an icon without data-tint takes no state colour', async () => {
        const container = await open();
        const icon = container.querySelector('.ov-state-icon .icon')!;
        icon.removeAttribute('data-tint');
        expect(effectiveValue(rulesMatching(css, icon), icon, '--fs-tint')).toBeUndefined();
    });
});
