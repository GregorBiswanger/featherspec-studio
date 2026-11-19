export function percentOf(done: number, total: number): number | undefined {
    if (total <= 0) {
        return undefined;
    }
    const rounded = Math.floor((200 * done + total) / (2 * total));
    return done < total ? Math.min(rounded, 99) : Math.min(rounded, 100);
}

export function percentSuffix(done: number, total: number): string {
    const percent = percentOf(done, total);
    return percent === undefined ? '' : ` · ${percent}%`;
}
