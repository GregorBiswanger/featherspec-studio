export interface WaitOptions {
    timeoutMs: number;
    intervalMs?: number;
}

const MAX_OBSERVED_LENGTH = 800;

function describeObserved(observed: unknown): string {
    let text: string;
    try {
        text = typeof observed === 'string' ? observed : (JSON.stringify(observed) ?? String(observed));
    } catch {
        text = String(observed);
    }
    return text.length > MAX_OBSERVED_LENGTH ? `${text.slice(0, MAX_OBSERVED_LENGTH)}...` : text;
}

export async function waitFor<T>(description: string, observe: () => T, isDone: (observed: T) => boolean, options: WaitOptions): Promise<T> {
    const started = Date.now();
    const interval = options.intervalMs ?? 100;
    let last = 'nothing observed yet';
    for (;;) {
        let failure: string | undefined;
        try {
            const observed = observe();
            last = describeObserved(observed);
            if (isDone(observed)) {
                return observed;
            }
        } catch (error) {
            failure = error instanceof Error ? error.message : String(error);
            last = `observing threw: ${failure}`;
        }
        const elapsed = Date.now() - started;
        if (elapsed >= options.timeoutMs) {
            throw new Error(`Timed out after ${elapsed} ms waiting for ${description}; last observed: ${last}`);
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(interval, Math.max(1, options.timeoutMs - elapsed))));
    }
}
