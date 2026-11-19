import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { click, mount, pressKey, type Mounted } from '../testing/dom';
import { Toggletip } from './Toggletip';

const LABEL = 'About this step';
const PARAGRAPHS = ['First paragraph.', 'Second paragraph.', 'Third paragraph.', 'Fourth paragraph.'];

let mounted: Mounted | undefined;

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

function Pair(props: { first?: readonly string[]; second?: readonly string[] }) {
    return (
        <div>
            <section data-id="one">
                <Toggletip label={LABEL} glyph="?" paragraphs={props.first ?? PARAGRAPHS} />
            </section>
            <section data-id="two">
                <Toggletip label={LABEL} glyph="?" paragraphs={props.second ?? ['Other.']} />
            </section>
            <button type="button" data-id="other">
                other
            </button>
            <p data-id="text">plain text</p>
        </div>
    );
}

async function show(first?: readonly string[], second?: readonly string[]): Promise<HTMLElement> {
    mounted = await mount(<Pair {...(first === undefined ? {} : { first })} {...(second === undefined ? {} : { second })} />);
    return mounted.container;
}

function toggle(container: HTMLElement, id: 'one' | 'two'): HTMLButtonElement {
    return container.querySelector<HTMLButtonElement>(`[data-id="${id}"] button`)!;
}

function region(container: HTMLElement, id: 'one' | 'two'): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-id="${id}"] [role="status"]`)!;
}

async function press(target: Element, key: string): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    await act(async () => {
        target.dispatchEvent(event);
    });
    return event;
}

async function pointerdown(target: Element): Promise<void> {
    await act(async () => {
        target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
}

describe('0021 AC-014: the toggletip is a button with a status region', () => {
    it('is reachable with Tab, named and titled About this step, collapsed and with an empty region', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        expect(button.tagName).toBe('BUTTON');
        expect(button.tabIndex).toBe(0);
        expect(button.textContent).toBe('?');
        expect(button.getAttribute('aria-label')).toBe(LABEL);
        expect(button.title).toBe(LABEL);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
        expect(button.nextElementSibling).toBe(region(container, 'one'));
    });

    it('a pointer press, Enter and Space open it: aria-expanded true and one paragraph each in the region', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect([...region(container, 'one').querySelectorAll('p')].map((p) => p.textContent)).toEqual(PARAGRAPHS);
        await click(button);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        await pressKey(button, 'Enter');
        expect(button.getAttribute('aria-expanded')).toBe('true');
        await pressKey(button, 'Enter');
        await pressKey(button, ' ');
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(region(container, 'one').querySelectorAll('p')).toHaveLength(4);
    });

    it('a second activation closes it, empties the region and leaves focus on the button', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        await click(button);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
        expect(document.activeElement).toBe(button);
    });

    it('Escape while open closes it, is handled (defaultPrevented) and leaves focus on the button; Escape while closed is not handled', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        const closed = await press(button, 'Escape');
        expect(closed.defaultPrevented).toBe(false);
        await click(button);
        const open = await press(button, 'Escape');
        expect(open.defaultPrevented).toBe(true);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
        expect(document.activeElement).toBe(button);
    });

    it('Escape anywhere while open, with focus on the body after a press on its text, closes it, is handled and puts focus on the button', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        await pointerdown(region(container, 'one').querySelector('p')!);
        await act(async () => {
            button.blur();
        });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(document.body);
        const event = await press(document.body, 'Escape');
        expect(event.defaultPrevented).toBe(true);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
        expect(document.activeElement).toBe(button);
    });

    it('Escape on another element of the page closes it too; other keys and Escape while closed are not handled', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        const other = container.querySelector<HTMLButtonElement>('[data-id="other"]')!;
        expect((await press(document.body, 'Escape')).defaultPrevented).toBe(false);
        await click(button);
        expect((await press(document.body, 'Enter')).defaultPrevented).toBe(false);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        const event = await press(other, 'Escape');
        expect(event.defaultPrevented).toBe(true);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(button);
    });

    it('the Escape listener lives only while it is open: closed by a press outside, a second Escape on the body is not handled; after unmounting nothing is handled', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        await pointerdown(container.querySelector('[data-id="text"]')!);
        expect((await press(document.body, 'Escape')).defaultPrevented).toBe(false);
        await click(button);
        mounted!.unmount();
        expect((await press(document.body, 'Escape')).defaultPrevented).toBe(false);
        mounted = undefined;
    });

    it('a pointer press outside the button and its region closes it', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        await pointerdown(container.querySelector('[data-id="text"]')!);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
    });

    it('a press on the button or inside the region keeps it open', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        await pointerdown(region(container, 'one').querySelector('p')!);
        await pointerdown(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(region(container, 'one').querySelectorAll('p')).toHaveLength(4);
    });

    it('focus moving to another control closes it; focus moving to nothing keeps it', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        const other = container.querySelector<HTMLButtonElement>('[data-id="other"]')!;
        await click(button);
        await act(async () => {
            button.focus();
            button.blur();
        });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        await act(async () => {
            button.focus();
            other.focus();
        });
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
    });

    it('PR #1 review: after a press on its text left focus on the body, the next focus change to another control closes it and Escape is no longer taken', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        const other = container.querySelector<HTMLButtonElement>('[data-id="other"]')!;
        await click(button);
        await pointerdown(region(container, 'one').querySelector('p')!);
        await act(async () => {
            button.blur();
        });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(document.body);
        await act(async () => {
            other.focus();
        });
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
        const event = await press(other, 'Escape');
        expect(event.defaultPrevented).toBe(false);
    });

    it('PR #1 review: negative control, focus staying on the body or returning to the button keeps it open', async () => {
        const container = await show();
        const button = toggle(container, 'one');
        await click(button);
        await pointerdown(region(container, 'one').querySelector('p')!);
        await act(async () => {
            button.blur();
        });
        await act(async () => {
            button.focus();
        });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(region(container, 'one').querySelectorAll('p')).toHaveLength(4);
    });

    it('opening one closes the other, so one region is filled at a time', async () => {
        const container = await show();
        await click(toggle(container, 'one'));
        await click(toggle(container, 'two'));
        expect(toggle(container, 'one').getAttribute('aria-expanded')).toBe('false');
        expect(region(container, 'one').textContent).toBe('');
        expect(toggle(container, 'two').getAttribute('aria-expanded')).toBe('true');
        expect(region(container, 'two').textContent).toBe('Other.');
        await click(toggle(container, 'one'));
        expect(toggle(container, 'two').getAttribute('aria-expanded')).toBe('false');
        expect(container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1);
    });

    it('rerendering with equal paragraphs keeps it open and a changed paragraph closes it', async () => {
        const holder = { set: (_next: readonly string[]): void => undefined };
        function Host() {
            const [paragraphs, setParagraphs] = useState<readonly string[]>(PARAGRAPHS);
            holder.set = setParagraphs;
            return <Toggletip label={LABEL} glyph="?" paragraphs={paragraphs} />;
        }
        mounted = await mount(<Host />);
        const container = mounted.container;
        const button = container.querySelector('button')!;
        await click(button);
        await act(async () => {
            holder.set([...PARAGRAPHS]);
        });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelectorAll('p')).toHaveLength(4);
        await act(async () => {
            holder.set(['Changed.', ...PARAGRAPHS.slice(1)]);
        });
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(container.querySelector('[role="status"]')!.textContent).toBe('');
    });

    it('each toggletip closes only itself: a content change of the closed one and its unmounting leave the open one open', async () => {
        const holder = { set: (_next: readonly string[]): void => undefined, hide: (_next: boolean): void => undefined };
        function Host() {
            const [first, setFirst] = useState<readonly string[]>(PARAGRAPHS);
            const [shown, setShown] = useState(true);
            holder.set = setFirst;
            holder.hide = (next) => setShown(!next);
            return (
                <div>
                    <section data-id="one">{shown ? <Toggletip label={LABEL} glyph="?" paragraphs={first} /> : null}</section>
                    <section data-id="two">
                        <Toggletip label={LABEL} glyph="?" paragraphs={['Other.']} />
                    </section>
                </div>
            );
        }
        mounted = await mount(<Host />);
        const container = mounted.container;
        await click(toggle(container, 'two'));
        expect(toggle(container, 'two').getAttribute('aria-expanded')).toBe('true');
        await act(async () => {
            holder.set(['Changed.', ...PARAGRAPHS.slice(1)]);
        });
        expect(toggle(container, 'one').getAttribute('aria-expanded')).toBe('false');
        expect(toggle(container, 'two').getAttribute('aria-expanded')).toBe('true');
        expect(region(container, 'two').textContent).toBe('Other.');
        await act(async () => {
            holder.hide(true);
        });
        expect(toggle(container, 'two').getAttribute('aria-expanded')).toBe('true');
        expect(region(container, 'two').textContent).toBe('Other.');
    });

    it('unmounting an open toggletip frees the slot: the next one opens and closes normally', async () => {
        const container = await show();
        await click(toggle(container, 'one'));
        mounted!.unmount();
        mounted = await mount(<Pair />);
        const next = mounted.container;
        await click(toggle(next, 'two'));
        expect(toggle(next, 'two').getAttribute('aria-expanded')).toBe('true');
        expect(toggle(next, 'one').getAttribute('aria-expanded')).toBe('false');
    });

    it('holds no focusable element in its region and posts no message', async () => {
        const post = vi.fn();
        (window as unknown as { acquireVsCodeApi?: () => { postMessage: typeof post } }).acquireVsCodeApi = () => ({ postMessage: post });
        const container = await show();
        await click(toggle(container, 'one'));
        const focusable = region(container, 'one').querySelectorAll('a, button, input, select, textarea, [tabindex]');
        expect(focusable).toHaveLength(0);
        expect(post).not.toHaveBeenCalled();
        delete (window as unknown as { acquireVsCodeApi?: unknown }).acquireVsCodeApi;
    });
});

describe('0026 AC-006: a toggletip that goes away with focus tells its owner', () => {
    function Holder(props: { onLeave: () => void }) {
        const [shown, setShown] = useState(true);
        return (
            <div>
                {shown ? <Toggletip label={LABEL} glyph="?" paragraphs={PARAGRAPHS} onLeaveWithFocus={props.onLeave} /> : null}
                <button type="button" data-id="hide" onClick={() => setShown(false)}>
                    hide
                </button>
            </div>
        );
    }

    it('unmounting while its button has focus calls the callback once; unmounting without focus does not', async () => {
        const leave = vi.fn();
        mounted = await mount(<Holder onLeave={leave} />);
        const tip = mounted.container.querySelector<HTMLButtonElement>('button.toggletip')!;
        await act(async () => tip.focus());
        await act(async () => mounted!.container.querySelector<HTMLButtonElement>('[data-id="hide"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(leave).toHaveBeenCalledTimes(1);
        mounted.unmount();
        const quiet = vi.fn();
        mounted = await mount(<Holder onLeave={quiet} />);
        await act(async () => mounted!.container.querySelector<HTMLButtonElement>('[data-id="hide"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(quiet).not.toHaveBeenCalled();
    });
});
