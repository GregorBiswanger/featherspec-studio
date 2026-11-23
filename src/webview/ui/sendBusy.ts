export const BUSY_RELEASE_MS = 30000;

interface Running {
    key: string;
    timer: ReturnType<typeof setTimeout>;
}

const running = new Map<string, Running>();
const listeners = new Set<() => void>();

function changed(): void {
    listeners.forEach((listener) => listener());
}

export function busyKey(assistant: string, line: string): string {
    return `${assistant}|${line}`;
}

export function beginBusy(token: string, key: string): void {
    endBusy(token);
    running.set(token, { key, timer: setTimeout(() => endBusy(token), BUSY_RELEASE_MS) });
    changed();
}

export function endBusy(token: string): void {
    const entry = running.get(token);
    if (entry !== undefined) {
        clearTimeout(entry.timer);
        running.delete(token);
        changed();
    }
}

export function isBusy(key: string): boolean {
    return [...running.values()].some((entry) => entry.key === key);
}

export function subscribeBusy(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
