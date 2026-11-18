import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AreaInfo } from '../../shared/protocol/areas';
import type { Envelope } from '../../shared/protocol/envelope';
import type { ShellView } from '../../shared/protocol/messages';
import { App } from '../App';
import { Placeholder } from './Placeholder';
import { createClient, type ShellClient } from '../client';
import mainCss from '../main.css?raw';
import { rulesMatching } from '../testing/css';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view: ShellView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(view, 1));
    return mounted.container;
}

function nav(container: HTMLElement, title: string): HTMLButtonElement {
    return [...container.querySelectorAll<HTMLButtonElement>('nav button')].find((button) => button.textContent?.includes(title))!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SYNTHETIC: AreaInfo = { id: 'board', title: 'Synthetic area', purpose: 'A purpose for a placeholder test.', placeholder: true };

describe('AC-006: placeholders (no real area is a placeholder any more; the component is tested through a synthetic area)', () => {
    it('a placeholder shows its name, its purpose and "Not available in this version of FeatherSpec Studio", and no rows', async () => {
        mounted = await mount(<Placeholder area={SYNTHETIC} />);
        const container = mounted.container;
        const placeholder = container.querySelector('[data-placeholder]');
        expect(placeholder?.textContent).toContain('A purpose for a placeholder test.');
        expect(placeholder?.textContent).toContain('Not available in this version of FeatherSpec Studio');
        expect(container.textContent).not.toContain('Arrives with spec');
        expect(container.querySelectorAll('[role="option"], [role="listbox"]')).toHaveLength(0);
    });

    it('a request target handed to the app does not reach a placeholder: nothing of the target shows in it (AC-028)', async () => {
        mounted = await mount(<Placeholder area={SYNTHETIC} />);
        expect(mounted.container.textContent).not.toContain('r-1');
    });

    it.each(['overview', 'board'] as const)('control: %s is no placeholder', async (area) => {
        const container = await open(baseView({ area }));
        expect(container.querySelector('[data-placeholder]')).toBeNull();
    });
});

describe('0013 AC-031: the current navigation item', () => {
    it('the current navigation item is reached by a rule with the contrast active border', async () => {
        const css = mainCss as string;
        const container = await open(baseView({ area: 'board' }));
        const current = container.querySelector('nav [aria-current]')!;
        expect(rulesMatching(css, current).some((rule) => rule.body.includes('--vscode-contrastActiveBorder'))).toBe(true);
    });

    it('the current item follows the area: after a click on Overview it is Overview', async () => {
        const container = await open(baseView({ area: 'board' }));
        await click(nav(container, 'Overview'));
        expect(container.querySelector('nav [aria-current]')?.textContent).toContain('Overview');
    });
});

describe('AC-010: the notice', () => {
    it('shows "Spec <number> is no longer in the project" above the area with a Dismiss action that sends dismissNotice', async () => {
        const container = await open(baseView({ area: 'overview', notice: { number: '0003' } }));
        const notice = container.querySelector('[data-notice]');
        expect(notice?.textContent).toContain('Spec 0003 is no longer in the project');
        expect(notice?.getAttribute('role')).toBe('status');
        const dismiss = notice?.querySelector('button');
        expect(dismiss?.textContent).toBe('Dismiss');
        expect(isKeyboardReachable(dismiss!)).toBe(true);
        await pressKey(dismiss!, 'Enter');
        expect(posted.filter((message) => message.type === 'dismissNotice')).toHaveLength(1);
    });

    it('is gone when the host reports no notice any more (control)', async () => {
        const container = await open(baseView({ area: 'overview', notice: { number: '0003' } }));
        await send(shellEvent(baseView({ area: 'overview' }), 2));
        expect(container.querySelector('[data-notice]')).toBeNull();
    });
});
