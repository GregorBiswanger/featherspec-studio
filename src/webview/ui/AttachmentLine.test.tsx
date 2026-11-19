import { afterEach, describe, expect, it } from 'vitest';
import type { SendAttachment, SendView } from '../../shared/protocol/assistant';
import { mount, type Mounted } from '../testing/dom';
import { AttachmentLine } from './AttachmentLine';
import { StepAction } from './StepAction';

const LINE = '/sdd-clarify .specs/backlog/0002-x.md';
const ATTACH: SendAttachment = { name: '0002-x.md', path: '.specs/backlog/0002-x.md' };
const COPILOT: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: ATTACH };
const CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'], attach: ATTACH };

let mounted: Mounted | undefined;

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

describe('0027 AC-003: the attachment line', () => {
    it('0027 AC-003 Given: Copilot, Backlog .specs/backlog/0002-x.md: the line reads `0002-x.md attached when sent` with the tooltip, literally', async () => {
        mounted = await mount(<AttachmentLine id="a1" attach={ATTACH} assistant="copilot" />);
        const line = mounted.container.querySelector<HTMLElement>('#a1')!;
        expect(line.tagName).toBe('P');
        expect(line.className).toBe('send-attach');
        expect(line.textContent).toBe('0002-x.md attached when sent');
        expect(line.getAttribute('title')).toBe("Send attaches .specs/backlog/0002-x.md to Copilot's chat as context. Copy prompt attaches nothing.");
    });

    it('0027 AC-003: Claude Code names itself in the tooltip, the same line text', async () => {
        mounted = await mount(<AttachmentLine id="a1" attach={ATTACH} assistant="claudeCode" />);
        const line = mounted.container.querySelector<HTMLElement>('#a1')!;
        expect(line.textContent).toBe('0002-x.md attached when sent');
        expect(line.getAttribute('title')).toBe("Send attaches .specs/backlog/0002-x.md to Claude Code's chat as context. Copy prompt attaches nothing.");
    });

    it('0027 AC-003: the chip holds the aria-hidden file glyph and the file name; no control, no tab stop', async () => {
        mounted = await mount(<AttachmentLine id="a1" attach={ATTACH} assistant="copilot" />);
        const line = mounted.container.querySelector<HTMLElement>('#a1')!;
        const chip = line.querySelector<HTMLElement>('.send-attach-chip')!;
        const glyph = chip.querySelector('svg')!;
        expect(glyph.getAttribute('data-icon')).toBe('file');
        expect(glyph.getAttribute('aria-hidden')).toBe('true');
        expect(chip.textContent).toBe('0002-x.md');
        expect(line.querySelectorAll(FOCUSABLE)).toHaveLength(0);
        expect(line.hasAttribute('tabindex')).toBe(false);
        expect(line.hasAttribute('role')).toBe(false);
    });

    it('0027 AC-003: a long name may wrap after a separator (0022 §4.6): the name carries break opportunities', async () => {
        mounted = await mount(<AttachmentLine id="a1" attach={{ name: '0024-send-next-step-to-assistant.md', path: '.specs/active/0024-send-next-step-to-assistant.md' }} assistant="copilot" />);
        expect(mounted.container.querySelectorAll('.send-attach-chip wbr').length).toBeGreaterThan(3);
        expect(mounted.container.querySelector('.send-attach')!.textContent).toBe('0024-send-next-step-to-assistant.md attached when sent');
    });
});

describe('0027 AC-003: StepAction puts the line after the split button and its status region', () => {
    const noop = (): void => undefined;

    it('the order inside the split button is unchanged; the line follows .send-split; the main part and each Send item are described by it', async () => {
        mounted = await mount(<StepAction send={COPILOT} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        const container = mounted.container;
        const split = container.querySelector('.send-split')!;
        const line = container.querySelector<HTMLElement>('.send-attach')!;
        expect(split.nextElementSibling).toBe(line);
        expect([...split.children].map((child) => child.className)).toEqual(['copy-button send-main', 'send-arrow', 'visually-hidden']);
        expect(container.querySelector('button.send-main')!.getAttribute('aria-describedby')).toBe(line.id);
        expect(line.id).not.toBe('');
        expect(container.querySelector('button.send-arrow')!.hasAttribute('aria-describedby')).toBe(false);
    });

    it('a view without attachment renders no line and no description', async () => {
        const { attach: _attach, ...plain } = CLAUDE;
        mounted = await mount(<StepAction send={plain} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        expect(mounted.container.querySelector('.send-attach')).toBeNull();
        expect(mounted.container.querySelector('[aria-describedby]')).toBeNull();
    });

    it('a Copy prompt without an offer renders no line', async () => {
        mounted = await mount(<StepAction send={undefined} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        expect(mounted.container.querySelector('.send-attach')).toBeNull();
    });
});
