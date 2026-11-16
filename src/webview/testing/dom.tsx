import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PROTOCOL_VERSION, type Envelope } from '../../shared/protocol/envelope';
import type { ShellView } from '../../shared/protocol/messages';
import type { MissionControlView } from '../../shared/protocol/missionControl';

export interface Mounted {
    container: HTMLElement;
    unmount(): void;
}

export async function mount(element: ReactElement): Promise<Mounted> {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
        root.render(element);
    });
    return {
        container,
        unmount() {
            act(() => root.unmount());
            container.remove();
        },
    };
}

export async function send(message: unknown): Promise<void> {
    await act(async () => {
        window.dispatchEvent(new MessageEvent('message', { data: message }));
    });
}

export function shellEvent(view: ShellView, seq: number, version: number = PROTOCOL_VERSION): Envelope {
    return { v: version, kind: 'evt', seq, type: 'shell', payload: { view } };
}

export function baseView(overrides: Partial<ShellView> = {}): ShellView {
    return {
        state: undefined,
        restricted: false,
        projectName: 'demo',
        area: 'missionControl',
        target: undefined,
        selection: undefined,
        notice: undefined,
        rows: [],
        ...overrides,
    };
}

export async function click(element: Element): Promise<void> {
    await act(async () => {
        (element as HTMLElement).click();
    });
}

export async function pressKey(element: Element, key: 'Enter' | ' '): Promise<void> {
    await act(async () => {
        const target = element as HTMLElement;
        const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        target.dispatchEvent(down);
        if (down.defaultPrevented) {
            return;
        }
        const native = target.tagName === 'BUTTON' && !(target as HTMLButtonElement).disabled;
        if (native && key === 'Enter') {
            target.click();
        }
        if (native && key === ' ') {
            target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
            target.click();
        }
    });
}

export function isKeyboardReachable(element: Element): boolean {
    const target = element as HTMLElement;
    return !(target as HTMLButtonElement).disabled && target.tabIndex >= 0;
}

export function missionControlEvent(view: MissionControlView | unknown): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'missionControl', payload: { view } };
}
