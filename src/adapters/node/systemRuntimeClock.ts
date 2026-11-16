import type { RuntimeClock } from '../../core/ports/runtimeMedium';

export function createSystemRuntimeClock(): RuntimeClock {
    return {
        epochMs: () => Date.now(),
        setTimeout(callback, milliseconds) {
            const handle = setTimeout(callback, milliseconds);
            return { dispose: () => clearTimeout(handle) };
        },
    };
}
