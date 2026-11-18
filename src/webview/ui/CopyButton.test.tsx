import { useState } from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPIED_LABEL, COPIED_TEXT, COPY_FAILED_LABEL, COPY_FAILED_TEXT, COPY_PROMPT_LABEL } from '../../shared/protocol/nextStepTexts';
import { click, mount, pressKey, type Mounted } from '../testing/dom';
import { detailView } from '../detail/testing/views';
import { SpecDetail } from '../detail/SpecDetail';
import { CopyButton } from './CopyButton';
import type { CopyLook, CopyResult } from './CopyButton';

const LINE = '/sdd-plan .specs/backlog/0007-x.md';

let mounted: Mounted | undefined;
let copied: string[];
let deliver: (result: CopyResult | undefined) => Promise<void>;

function Harness(props: { initial?: CopyResult; look?: CopyLook }) {
    const [result, setResult] = useState<CopyResult | undefined>(props.initial);
    deliver = async (next) => {
        await act(async () => {
            setResult(next);
        });
    };
    return <CopyButton look={props.look ?? 'primary'} line={LINE} copyResult={result} onCopy={(line) => void copied.push(line)} />;
}

async function show(initial?: CopyResult, look?: CopyLook): Promise<HTMLElement> {
    mounted = await mount(<Harness initial={initial} {...(look === undefined ? {} : { look })} />);
    return mounted.container;
}

function button(container: HTMLElement): HTMLButtonElement {
    return container.querySelector('button')!;
}

function live(container: HTMLElement): HTMLElement {
    return container.querySelector('[role="status"]')!;
}

async function advance(ms: number): Promise<void> {
    await act(async () => {
        vi.advanceTimersByTime(ms);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    copied = [];
});

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    vi.useRealTimers();
});

describe('0021 AC-008: the label of every copy control is Copy prompt', () => {
    it('the constant reads Copy prompt, and the three labels differ from the old Copy', () => {
        expect(COPY_PROMPT_LABEL).toBe('Copy prompt');
        expect([COPY_PROMPT_LABEL, COPIED_LABEL, COPY_FAILED_LABEL]).toEqual(['Copy prompt', 'Copied', 'Could not copy']);
    });
});

describe('0016 AC-018: Copy confirms at the button', () => {
    it('AC-018: before any activation the button reads Copy prompt, has no tooltip and its live region is empty and ready', async () => {
        const container = await show();
        expect(button(container).textContent).toBe('Copy prompt');
        expect(button(container).getAttribute('aria-label')).toBe(`Copy prompt: ${LINE}`);
        expect(button(container).hasAttribute('title')).toBe(false);
        expect(live(container).textContent).toBe('');
        expect(live(container).getAttribute('aria-live')).toBe('polite');
        expect(live(container).getAttribute('aria-atomic')).toBe('true');
    });

    it('AC-018: a pointer activation sends the line; the success result gives the label Copied, the tooltip, the announcement and the accessible name', async () => {
        const container = await show();
        await click(button(container));
        expect(copied).toEqual([LINE]);
        await deliver({ ok: true, text: COPIED_TEXT });
        expect(button(container).textContent).toBe(COPIED_LABEL);
        expect(button(container).getAttribute('title')).toBe('Copied to the clipboard.');
        expect(button(container).getAttribute('aria-label')).toBe(`Copied: ${LINE}`);
        expect(live(container).textContent).toBe('Copied to the clipboard.');
    });

    it('AC-018: a failed write gives Could not copy and its sentence', async () => {
        const container = await show();
        await click(button(container));
        await deliver({ ok: false, text: COPY_FAILED_TEXT });
        expect(button(container).textContent).toBe(COPY_FAILED_LABEL);
        expect(button(container).getAttribute('aria-label')).toBe(`Could not copy: ${LINE}`);
        expect(button(container).getAttribute('title')).toBe('Could not copy to the clipboard.');
        expect(live(container).textContent).toBe('Could not copy to the clipboard.');
    });

    it.each([['Enter' as const], [' ' as const]])('AC-018: the key %j activates it like a pointer does', async (key) => {
        const container = await show();
        await pressKey(button(container), key);
        expect(copied).toEqual([LINE]);
        await deliver({ ok: true, text: COPIED_TEXT });
        expect(button(container).textContent).toBe(COPIED_LABEL);
    });

    it('AC-018: 2 s after the activation the label is Copy prompt again, with the tooltip it had before and an empty live region', async () => {
        const container = await show();
        await click(button(container));
        await deliver({ ok: true, text: COPIED_TEXT });
        await advance(1999);
        expect(button(container).textContent).toBe(COPIED_LABEL);
        await advance(1);
        expect(button(container).textContent).toBe('Copy prompt');
        expect(button(container).hasAttribute('title')).toBe(false);
        expect(button(container).getAttribute('aria-label')).toBe(`Copy prompt: ${LINE}`);
        expect(live(container).textContent).toBe('');
    });

    it('AC-018: an activation at 1.5 s restarts the 2 s, counted from the last activation', async () => {
        const container = await show();
        await click(button(container));
        await deliver({ ok: true, text: COPIED_TEXT });
        await advance(1500);
        await click(button(container));
        await deliver({ ok: true, text: COPIED_TEXT });
        await advance(1999);
        expect(button(container).textContent).toBe(COPIED_LABEL);
        await advance(1);
        expect(button(container).textContent).toBe('Copy prompt');
    });

    it('AC-018: a result that was there before the activation does not set the label (negative control)', async () => {
        const container = await show({ ok: true, text: COPIED_TEXT });
        expect(button(container).textContent).toBe('Copy prompt');
        expect(live(container).textContent).toBe('');
        await click(button(container));
        expect(button(container).textContent).toBe('Copy prompt');
    });

    it('AC-018: a result that arrives after the 2 s do not change a button nobody activated since (negative control)', async () => {
        const container = await show();
        await click(button(container));
        await advance(2000);
        await deliver({ ok: true, text: COPIED_TEXT });
        expect(button(container).textContent).toBe('Copy prompt');
    });

    it('AC-018: unmounting clears the timer', async () => {
        await show();
        await click(button(mounted!.container));
        expect(vi.getTimerCount()).toBe(1);
        mounted!.unmount();
        mounted = undefined;
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('0016 AC-019: nothing else moves while the feedback shows', () => {
    function Detail() {
        const [result, setResult] = useState<CopyResult | undefined>(undefined);
        deliver = async (next) => {
            await act(async () => {
                setResult(next);
            });
        };
        const detail = detailView();
        if (detail.kind !== 'spec') {
            throw new Error('a spec detail is expected');
        }
        return <SpecDetail detail={detail} fileResult={undefined} copyResult={result} onOpen={() => undefined} onCopy={(line) => void copied.push(line)} />;
    }

    function mutationsOutside(root: HTMLElement, allowed: Element[], run: () => Promise<void>): Promise<MutationRecord[]> {
        const records: MutationRecord[] = [];
        const observer = new MutationObserver((batch) => records.push(...batch));
        observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
        return run().then(() => {
            records.push(...observer.takeRecords());
            observer.disconnect();
            return records.filter((record) => !allowed.some((element) => element === record.target || element.contains(record.target)));
        });
    }

    it('AC-019: activating Copy and showing the result changes only the button and its live region', async () => {
        mounted = await mount(<Detail />);
        const root = mounted.container;
        const target = root.querySelector<HTMLButtonElement>('.next-step button')!;
        const region = target.parentElement!.querySelector('[role="status"]')!;
        const outside = await mutationsOutside(root, [target, region], async () => {
            await click(target);
            await deliver({ ok: true, text: COPIED_TEXT });
            await advance(2000);
        });
        expect(outside).toEqual([]);
    });

    it('AC-019 negative control: an element added beside the button is caught', async () => {
        mounted = await mount(<Detail />);
        const root = mounted.container;
        const target = root.querySelector<HTMLButtonElement>('.next-step button')!;
        const region = target.parentElement!.querySelector('[role="status"]')!;
        const outside = await mutationsOutside(root, [target, region], async () => {
            await act(async () => {
                root.querySelector('.next-step')!.appendChild(document.createElement('div'));
            });
        });
        expect(outside.length).toBeGreaterThan(0);
    });
});

describe('0017 AC-006: the optional tab index', () => {
    it('sets the tab index when given and leaves the button at its default (reachable by Tab) when not', async () => {
        const container = await show();
        expect(button(container).tabIndex).toBe(0);
        mounted?.unmount();
        mounted = await mount(<CopyButton look="primary" line={LINE} copyResult={undefined} onCopy={() => undefined} tabIndex={-1} />);
        expect(mounted.container.querySelector('button')?.tabIndex).toBe(-1);
    });
});

describe('0022 AC-012: the icon Copy', () => {
    const icon = (container: HTMLElement): string | null | undefined => container.querySelector('button svg')?.getAttribute('data-icon');

    it('is a text-less button with the copy glyph, the name and the tooltip `Copy prompt: <line>`, an empty live region and none of the primary classes', async () => {
        const container = await show(undefined, 'icon');
        const element = button(container);
        expect(element.classList.contains('copy-icon')).toBe(true);
        expect(element.classList.contains('copy-button')).toBe(false);
        expect(element.textContent).toBe('');
        expect(element.getAttribute('aria-label')).toBe(`Copy prompt: ${LINE}`);
        expect(element.getAttribute('title')).toBe(`Copy prompt: ${LINE}`);
        expect(icon(container)).toBe('copy');
        expect(live(container).textContent).toBe('');
    });

    it('a pointer activation, Enter and Space each copy the full first line', async () => {
        const container = await show(undefined, 'icon');
        await click(button(container));
        await pressKey(button(container), 'Enter');
        await pressKey(button(container), ' ');
        expect(copied).toEqual([LINE, LINE, LINE]);
    });

    it('the success shows the check, the name Copied, the sentence as tooltip and announcement, on the same element', async () => {
        const container = await show(undefined, 'icon');
        const element = button(container);
        await click(element);
        await deliver({ ok: true, text: COPIED_TEXT });
        expect(button(container)).toBe(element);
        expect(icon(container)).toBe('check');
        expect(element.getAttribute('aria-label')).toBe(`Copied: ${LINE}`);
        expect(element.getAttribute('title')).toBe(COPIED_TEXT);
        expect(live(container).textContent).toBe(COPIED_TEXT);
        expect(element.textContent).toBe('');
    });

    it('a failed write shows the warning, the name Could not copy and its sentence', async () => {
        const container = await show(undefined, 'icon');
        await click(button(container));
        await deliver({ ok: false, text: COPY_FAILED_TEXT });
        expect(icon(container)).toBe('diagnostic');
        expect(button(container).getAttribute('aria-label')).toBe(`${COPY_FAILED_LABEL}: ${LINE}`);
        expect(button(container).getAttribute('title')).toBe(COPY_FAILED_TEXT);
        expect(live(container).textContent).toBe(COPY_FAILED_TEXT);
    });

    it('2000 ms after the last activation everything is restored: glyph, name, tooltip, live region; an activation at 1.5 s restarts the time', async () => {
        const container = await show(undefined, 'icon');
        await click(button(container));
        await deliver({ ok: true, text: COPIED_TEXT });
        await advance(1500);
        await click(button(container));
        await deliver({ ok: true, text: COPIED_TEXT });
        await advance(1999);
        expect(icon(container)).toBe('check');
        await advance(1);
        expect(icon(container)).toBe('copy');
        expect(button(container).getAttribute('aria-label')).toBe(`Copy prompt: ${LINE}`);
        expect(button(container).getAttribute('title')).toBe(`Copy prompt: ${LINE}`);
        expect(live(container).textContent).toBe('');
    });

    it('a result that was there before the activation changes nothing (negative control)', async () => {
        const container = await show({ ok: true, text: COPIED_TEXT }, 'icon');
        expect(icon(container)).toBe('copy');
        await click(button(container));
        expect(icon(container)).toBe('copy');
    });

    it('selects nothing and keeps the tab index it is given', async () => {
        const container = await show(undefined, 'icon');
        await click(button(container));
        expect(window.getSelection()?.toString() ?? '').toBe('');
        expect(button(container).tabIndex).toBe(0);
        mounted?.unmount();
        mounted = await mount(<CopyButton look="icon" line={LINE} copyResult={undefined} onCopy={() => undefined} tabIndex={-1} />);
        expect(mounted.container.querySelector('button')?.tabIndex).toBe(-1);
    });
});

describe('0022 AC-010: the secondary Copy', () => {
    it('is the text button of 0016 with the secondary class and not the primary one alone', async () => {
        const container = await show(undefined, 'secondary');
        const element = button(container);
        expect(element.classList.contains('copy-button')).toBe(true);
        expect(element.classList.contains('copy-secondary')).toBe(true);
        expect(element.textContent).toBe('Copy prompt');
        expect(element.getAttribute('aria-label')).toBe(`Copy prompt: ${LINE}`);
        await click(element);
        await deliver({ ok: true, text: COPIED_TEXT });
        expect(element.textContent).toBe(COPIED_LABEL);
    });

    it('control: the primary Copy carries no secondary class', async () => {
        const container = await show();
        expect(button(container).classList.contains('copy-secondary')).toBe(false);
    });
});
