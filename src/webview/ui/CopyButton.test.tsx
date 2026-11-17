import { useState } from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPIED_LABEL, COPIED_TEXT, COPY_FAILED_LABEL, COPY_FAILED_TEXT, NEXT_STEP_COPY_LABEL } from '../../shared/protocol/nextStepTexts';
import { click, mount, pressKey, type Mounted } from '../testing/dom';
import { detailView } from '../detail/testing/views';
import { SpecDetail } from '../detail/SpecDetail';
import { CopyButton } from './CopyButton';
import type { CopyResult } from './CopyButton';

const LINE = '/sdd-plan .specs/backlog/0007-x.md';

let mounted: Mounted | undefined;
let copied: string[];
let deliver: (result: CopyResult | undefined) => Promise<void>;

function Harness(props: { initial?: CopyResult }) {
    const [result, setResult] = useState<CopyResult | undefined>(props.initial);
    deliver = async (next) => {
        await act(async () => {
            setResult(next);
        });
    };
    return <CopyButton line={LINE} copyResult={result} onCopy={(line) => void copied.push(line)} />;
}

async function show(initial?: CopyResult): Promise<HTMLElement> {
    mounted = await mount(<Harness initial={initial} />);
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

describe('0016 AC-018: Copy confirms at the button', () => {
    it('AC-018: before any activation the button reads Copy, has no tooltip and its live region is empty and ready', async () => {
        const container = await show();
        expect(button(container).textContent).toBe(NEXT_STEP_COPY_LABEL);
        expect(button(container).getAttribute('aria-label')).toBe(`Copy: ${LINE}`);
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

    it('AC-018: 2 s after the activation the label is Copy again, with the tooltip it had before and an empty live region', async () => {
        const container = await show();
        await click(button(container));
        await deliver({ ok: true, text: COPIED_TEXT });
        await advance(1999);
        expect(button(container).textContent).toBe(COPIED_LABEL);
        await advance(1);
        expect(button(container).textContent).toBe(NEXT_STEP_COPY_LABEL);
        expect(button(container).hasAttribute('title')).toBe(false);
        expect(button(container).getAttribute('aria-label')).toBe(`Copy: ${LINE}`);
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
        expect(button(container).textContent).toBe(NEXT_STEP_COPY_LABEL);
    });

    it('AC-018: a result that was there before the activation does not set the label (negative control)', async () => {
        const container = await show({ ok: true, text: COPIED_TEXT });
        expect(button(container).textContent).toBe(NEXT_STEP_COPY_LABEL);
        expect(live(container).textContent).toBe('');
        await click(button(container));
        expect(button(container).textContent).toBe(NEXT_STEP_COPY_LABEL);
    });

    it('AC-018: a result that arrives after the 2 s do not change a button nobody activated since (negative control)', async () => {
        const container = await show();
        await click(button(container));
        await advance(2000);
        await deliver({ ok: true, text: COPIED_TEXT });
        expect(button(container).textContent).toBe(NEXT_STEP_COPY_LABEL);
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
        return <SpecDetail detail={detailView()} fileResult={undefined} copyResult={result} onOpen={() => undefined} onCopy={(line) => void copied.push(line)} />;
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
