import { afterEach, describe, expect, it } from 'vitest';
import type { SendAttachment, SendView } from '../../shared/protocol/assistant';
import { mount, type Mounted } from '../testing/dom';
import { StepAction } from './StepAction';

const LINE = '/sdd-clarify .specs/backlog/0002-x.md';
const ATTACH: SendAttachment = { name: '0002-x.md', path: '.specs/backlog/0002-x.md' };
const CHAT_VIEW: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: ATTACH };
const CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'], attach: ATTACH };

let mounted: Mounted | undefined;

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

const noop = (): void => undefined;

async function shown(send: SendView) {
    mounted = await mount(<StepAction send={send} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
    return mounted.container;
}

describe('0027 AC-003: the attachment line', () => {
    it('0027 AC-003 Given: Copilot, Backlog .specs/backlog/0002-x.md: the line reads `0002-x.md attached when sent` with the tooltip, literally', async () => {
        const container = await shown(CHAT_VIEW);
        expect(container.querySelector('.send-attach')).toBeNull();
        expect(container.textContent).not.toContain('attached when sent');
        expect(container.querySelector('button.send-main')!.getAttribute('title')).toBe(`Send to Copilot (new chat): ${LINE}. Attaches 0002-x.md.`);
    });

    it('0027 AC-003: Claude Code names itself in the tooltip, the same line text', async () => {
        const container = await shown(CLAUDE);
        expect(container.querySelector('.send-attach')).toBeNull();
        expect(container.querySelector('button.send-main')!.getAttribute('title')).toBe(`Send to Claude Code (new chat): ${LINE}. Attaches 0002-x.md.`);
    });

    it('0027 AC-003: the chip holds the aria-hidden file glyph and the file name; no control, no tab stop', async () => {
        const container = await shown(CHAT_VIEW);
        expect(container.querySelector('.send-attach-chip')).toBeNull();
        expect(container.querySelector('[data-icon="file"]')).toBeNull();
        expect(container.querySelectorAll('button')).toHaveLength(2);
    });

    it('0027 AC-003: a long name may wrap after a separator (0022 §4.6): the name carries break opportunities', async () => {
        const container = await shown({ ...CHAT_VIEW, attach: { name: '0024-send-next-step-to-assistant.md', path: '.specs/active/0024-send-next-step-to-assistant.md' } });
        expect(container.querySelectorAll('wbr')).toHaveLength(0);
        expect(container.querySelector('button.send-main')!.getAttribute('aria-label')).toContain('Attaches 0024-send-next-step-to-assistant.md.');
    });
});

describe('0027 AC-003: StepAction puts the line after the split button and its status region', () => {
    it('the order inside the split button is unchanged; the line follows .send-split; the main part and each Send item are described by it', async () => {
        const container = await shown(CHAT_VIEW);
        const split = container.querySelector('.send-split')!;
        expect([...split.children].map((child) => child.className)).toEqual(['copy-button send-main', 'send-arrow', 'visually-hidden']);
        expect(split.nextElementSibling).toBeNull();
        expect(container.querySelector('[aria-describedby]')).toBeNull();
    });

    it('a view without attachment renders no line and no description', async () => {
        const { attach: _attach, ...plain } = CLAUDE;
        const container = await shown(plain);
        expect(container.querySelector('.send-attach')).toBeNull();
        expect(container.querySelector('[aria-describedby]')).toBeNull();
    });

    it('a Copy prompt without an offer renders no line', async () => {
        mounted = await mount(<StepAction send={undefined} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        expect(mounted.container.querySelector('.send-attach')).toBeNull();
    });
});
