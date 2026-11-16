import type { ClockPort } from '../../core/ports/host';

export function createSystemClock(): ClockPort {
    return {
        now: () => new Date().toISOString(),
        setTimeout(callback, milliseconds) {
            const handle = setTimeout(callback, milliseconds);
            return { dispose: () => clearTimeout(handle) };
        },
    };
}
