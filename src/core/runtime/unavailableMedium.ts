import type { RuntimeMedium } from '../ports/runtimeMedium';

export function createUnavailableMedium(reason: string): RuntimeMedium {
    const fail = async (): Promise<never> => {
        throw new Error(reason);
    };
    return {
        open: fail,
        read: fail,
        lines: () => ({
            [Symbol.asyncIterator]: () => ({ next: fail }),
        }),
        append: fail,
        replace: fail,
        createExclusive: fail,
        remove: fail,
        list: fail,
    };
}
