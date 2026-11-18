import { useState } from 'react';

export interface FocusHandoff {
    offer(): void;
    take(): boolean;
    clear(): void;
}

function createFocusHandoff(): FocusHandoff {
    let pending = false;
    return {
        offer() {
            pending = true;
        },
        take() {
            const taken = pending;
            pending = false;
            return taken;
        },
        clear() {
            pending = false;
        },
    };
}

export function useFocusHandoff(): FocusHandoff {
    const [handoff] = useState(createFocusHandoff);
    return handoff;
}
