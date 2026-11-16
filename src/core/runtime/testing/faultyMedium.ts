import type { RuntimeMedium } from '../../ports/runtimeMedium';

export interface Faults {
    failNext(match?: string): void;
    hangWrites(on: boolean): void;
    failOpen(reason: string | undefined): void;
    failRemove(match: string | undefined): void;
    writeAttempts(): number;
}

export function createFaults(): { faults: Faults; state: FaultState } {
    const state: FaultState = { failures: [], hang: false, openFailure: undefined, removeFailure: undefined, attempts: 0 };
    const faults: Faults = {
        failNext: (match) => void state.failures.push(match),
        hangWrites: (on) => {
            state.hang = on;
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
    openFailure: string | undefined;
    removeFailure: string | undefined;
    attempts: number;
}

export function createFaultyMedium(inner: RuntimeMedium, state: FaultState): RuntimeMedium {
    async function guardWrite(name: string): Promise<void> {
        state.attempts += 1;
        if (state.hang) {
            await new Promise<never>(() => undefined);
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
            await inner.open();
        },
        read: (name) => inner.read(name),
        lines: (name) => inner.lines(name),
        async append(name, text) {
            await guardWrite(name);
            await inner.append(name, text);
        },
        async replace(name, text) {
            await guardWrite(name);
            await inner.replace(name, text);
        },
        async createExclusive(name, text) {
            await guardWrite(name);
            return inner.createExclusive(name, text);
        },
        async remove(name) {
            if (state.removeFailure !== undefined && name.includes(state.removeFailure)) {
                throw new Error(`injected remove failure for ${name}`);
            }
            await inner.remove(name);
        },
        list: (directory) => inner.list(directory),
    };
}
