import * as vm from 'node:vm';

export function browserContext(extra: Record<string, unknown>): vm.Context {
    return vm.createContext({
        TextDecoder,
        TextEncoder,
        URL,
        AbortController,
        AbortSignal,
        setTimeout,
        clearTimeout,
        queueMicrotask,
        crypto: globalThis.crypto,
        console,
        ...extra,
    });
}
