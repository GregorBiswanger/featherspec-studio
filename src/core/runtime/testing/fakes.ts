import type {
    CredentialValuesPort,
    IdSource,
    RuntimeClock,
    RuntimeNoticePort,
} from '../../ports/runtimeMedium';
import type { Disposable } from '../../ports/host';

export interface FakeRuntimeClock extends RuntimeClock {
    advance(milliseconds: number): void;
    set(epochMs: number): void;
    pendingTimers(): number;
}

export function createFakeRuntimeClock(start = Date.UTC(2026, 10, 16, 8, 0, 0)): FakeRuntimeClock {
    let time = start;
    let nextTimer = 0;
    const timers = new Map<number, { due: number; callback: () => void }>();
    return {
        epochMs: () => time,
        setTimeout(callback, milliseconds): Disposable {
            const id = nextTimer++;
            timers.set(id, { due: time + milliseconds, callback });
            return { dispose: () => void timers.delete(id) };
        },
        advance(milliseconds) {
            const target = time + milliseconds;
            for (;;) {
                const next = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
                if (next === undefined) {
                    break;
                }
                timers.delete(next[0]);
                time = Math.max(time, next[1].due);
                next[1].callback();
            }
            time = target;
        },
        set(epochMs) {
            time = epochMs;
        },
        pendingTimers: () => timers.size,
    };
}

export function createSequentialIds(prefix = 'run'): IdSource {
    let counter = 0;
    return { newId: () => `${prefix}-${++counter}` };
}

export interface FakeNotices extends RuntimeNoticePort {
    messages: string[];
}

export function createFakeNotices(): FakeNotices {
    const notices: FakeNotices = {
        messages: [],
        show(message) {
            notices.messages.push(message);
        },
    };
    return notices;
}

export interface FakeCredentials extends CredentialValuesPort {
    held: string[];
}

export function createFakeCredentials(...held: string[]): FakeCredentials {
    const credentials: FakeCredentials = { held, values: () => credentials.held };
    return credentials;
}

export async function settle(): Promise<void> {
    for (let turn = 0; turn < 5; turn += 1) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
}
