/** PD-079, 0025 U-04: done / total in percent, rounded half up; 99 at most while not all are done. */
export function percentOf(done: number, total: number): number | undefined {
    if (total <= 0) {
        return undefined;
    }
    const rounded = Math.floor((200 * done + total) / (2 * total));
    return done < total ? Math.min(rounded, 99) : Math.min(rounded, 100);
}

/** ` · <p>%` (U-04), empty where no percentage exists. */
export function percentSuffix(done: number, total: number): string {
    const percent = percentOf(done, total);
    return percent === undefined ? '' : ` · ${percent}%`;
}
