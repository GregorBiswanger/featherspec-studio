import type { RuntimeMedium } from '../../ports/runtimeMedium';

export interface Faults {
    failNext(match?: string): void;
    hangWrites(on: boolean): void;
    failOpen(reason: string | undefined): void;
    failRemove(match: string | undefined): void;
    writeAttempts(): number;
}

export function createFaults(): { faults: Faults; state: FaultState } {
    const state: FaultState = { failures: [], hang: false, release: [], openFailure: undefined, removeFailure: undefined, attempts: 0, inFlight: 0 };
    const faults: Faults = {
        failNext: (match) => void state.failures.push(match),
        hangWrites: (on) => {
            state.hang = on;
            if (!on) {
                state.release.splice(0).forEach((release) => release());
            }
        },
        failOpen: (reason) => {
            state.openFailure = reason;
        },
        failRemove: (match) => {
            state.removeFailure = match;
        },
        writeAttempts: () => state.attempts,
    };
    return { faults, state };
}

export interface FaultState {
    failures: (string | undefined)[];
    hang: boolean;
    release: (() => void)[];
    openFailure: string | undefined;
    removeFailure: string | undefined;
    attempts: number;
    inFlight: number;
}

export function createFaultyMedium(inner: RuntimeMedium, state: FaultState): RuntimeMedium {
    async function tracked<T>(action: () => Promise<T>): Promise<T> {
        state.inFlight += 1;
        try {
            return await action();
        } finally {
            state.inFlight -= 1;
        }
    }
    async function guardWrite(name: string): Promise<void> {
        state.attempts += 1;
        if (state.hang) {
            await new Promise<void>((resolve) => state.release.push(resolve));
        }
        const index = state.failures.findIndex((match) => match === undefined || name.includes(match));
        if (index >= 0) {
            state.failures.splice(index, 1);
            throw new Error(`injected write failure for ${name}`);
        }
    }
    return {
        async open() {
            if (state.openFailure !== undefined) {
                throw new Error(state.openFailure);
            }
            await tracked(() => inner.open());
        },
        read: (name) => tracked(() => inner.read(name)),
        async *lines(name) {
            state.inFlight += 1;
            try {
                yield* inner.lines(name);
            } finally {
                state.inFlight -= 1;
            }
        },
        async append(name, text) {
            await guardWrite(name);
            await tracked(() => inner.append(name, text));
        },
        async replace(name, text) {
            await guardWrite(name);
            await tracked(() => inner.replace(name, text));
        },
        async createExclusive(name, text) {
            await guardWrite(name);
            return tracked(() => inner.createExclusive(name, text));
        },
        async remove(name) {
            if (state.removeFailure !== undefined && name.includes(state.removeFailure)) {
                throw new Error(`injected remove failure for ${name}`);
            }
            await tracked(() => inner.remove(name));
        },
        list: (directory) => tracked(() => inner.list(directory)),
    };
}
