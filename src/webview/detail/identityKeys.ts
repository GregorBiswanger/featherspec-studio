export function identityKeys<T>(items: readonly T[], identity: (item: T) => string): string[] {
    const seen = new Map<string, number>();
    return items.map((item) => {
        const base = identity(item);
        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        return `${base}|${count}`;
    });
}
