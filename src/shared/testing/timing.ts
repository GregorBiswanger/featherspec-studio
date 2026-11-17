export const BUDGET_MS = {
    uiFreshness: 500,
    modelUpdate: 1000,
    fullRead: 2000,
    discovery: 2000,
    frame: 1000,
} as const;

export async function bestOfThree(measured: () => void | Promise<void>, prepare?: () => void | Promise<void>): Promise<number> {
    await prepare?.();
    await measured();
    let best = Number.POSITIVE_INFINITY;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await prepare?.();
        const started = performance.now();
        await measured();
        best = Math.min(best, performance.now() - started);
    }
    return best;
}
