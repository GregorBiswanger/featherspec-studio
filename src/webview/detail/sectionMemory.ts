import { useState } from 'react';

const collapsed = new Map<string, boolean>();

export function resetSectionMemory(): void {
    collapsed.clear();
}

export function useCollapsed(name: string): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState(() => collapsed.get(name) ?? false);
    return [
        value,
        (next: boolean) => {
            collapsed.set(name, next);
            setValue(next);
        },
    ];
}
