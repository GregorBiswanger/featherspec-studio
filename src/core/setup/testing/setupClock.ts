import type { ClockPort, Disposable } from '../../ports/host';

export interface SetupClock extends ClockPort {
    advance(milliseconds: number): void;
    pendingTimers(): number;
    elapsed(): number;
}

export function createSetupClock(startIso = '2026-11-17T12:00:00.000Z'): SetupClock {
    const start = Date.parse(startIso);
    let time = 0;
    let next = 0;
    const timers = new Map<number, { due: number; callback: () => void }>();
    return {
        now: () => new Date(start + time).toISOString(),
        setTimeout(callback, milliseconds): Disposable {
            const id = next++;
            timers.set(id, { due: time + milliseconds, callback });
            return { dispose: () => void timers.delete(id) };
        },
        advance(milliseconds) {
            const target = time + milliseconds;
            for (;;) {
                const due = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((first, second) => first[1].due - second[1].due)[0];
                if (due === undefined) {
                    break;
                }
                timers.delete(due[0]);
                time = Math.max(time, due[1].due);
                due[1].callback();
            }
            time = target;
        },
        pendingTimers: () => timers.size,
        elapsed: () => time,
    };
}
