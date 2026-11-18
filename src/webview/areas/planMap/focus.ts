let pendingStem: string | undefined;

function headings(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[data-map-heading]')];
}

export function requestMapFocus(stem: string): void {
    const shown = headings().find((heading) => heading.getAttribute('data-map-stem') === stem);
    if (shown !== undefined) {
        pendingStem = undefined;
        shown.focus();
        return;
    }
    pendingStem = stem;
}

export function takePendingMapFocus(stem: string): boolean {
    if (pendingStem !== stem) {
        return false;
    }
    pendingStem = undefined;
    return true;
}

export function forgetMapFocus(): void {
    pendingStem = undefined;
}
