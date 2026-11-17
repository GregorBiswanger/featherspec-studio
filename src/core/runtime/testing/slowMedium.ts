import type { MediumLine, RuntimeMedium } from '../../ports/runtimeMedium';

export function createSlowMedium(inner: RuntimeMedium, delayMs: number): RuntimeMedium {
    const pause = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    async function slow<T>(action: () => Promise<T>): Promise<T> {
        await pause();
        return action();
    }
    return {
        open: () => slow(() => inner.open()),
        read: (name) => slow(() => inner.read(name)),
        async *lines(name): AsyncGenerator<MediumLine> {
            await pause();
            yield* inner.lines(name);
        },
        append: (name, text) => slow(() => inner.append(name, text)),
        replace: (name, text) => slow(() => inner.replace(name, text)),
        createExclusive: (name, text) => slow(() => inner.createExclusive(name, text)),
        remove: (name) => slow(() => inner.remove(name)),
        list: (directory) => slow(() => inner.list(directory)),
    };
}
