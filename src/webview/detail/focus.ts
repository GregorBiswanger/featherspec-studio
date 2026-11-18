import { currentOpener, forgetOpener } from './opener';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let pendingStem: string | undefined;

function headings(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[data-detail-heading]')];
}

export function requestHeadingFocus(stem: string): void {
    const shown = headings().find((heading) => heading.getAttribute('data-detail-stem') === stem);
    if (shown !== undefined) {
        pendingStem = undefined;
        shown.focus();
        return;
    }
    pendingStem = stem;
}

export function takePendingHeadingFocus(stem: string): boolean {
    if (pendingStem !== stem) {
        return false;
    }
    pendingStem = undefined;
    return true;
}

export function focusHeading(): boolean {
    const heading = headings()[0];
    heading?.focus();
    return heading !== undefined;
}

function firstFocusable(root: ParentNode | null): HTMLElement | undefined {
    return root === null ? undefined : (root.querySelector<HTMLElement>(FOCUSABLE) ?? undefined);
}

export function focusAfterClose(stem: string): void {
    pendingStem = undefined;
    const opener = currentOpener(stem);
    forgetOpener();
    if (opener !== undefined && opener.isConnected) {
        opener.focus();
        return;
    }
    const content = document.querySelector('.area-content');
    const own = [...(content?.querySelectorAll<HTMLElement>('[data-spec-stem], [data-spec-row] .ov-row') ?? [])].find(
        (element) => (element.getAttribute('data-spec-stem') ?? element.closest('[data-spec-row]')?.getAttribute('data-spec-row')) === stem,
    );
    (own ?? firstFocusable(content))?.focus();
}

export function focusSpecListRow(stem: string, path: string | undefined): void {
    const rows = [...document.querySelectorAll<HTMLElement>('[role="option"][data-spec-stem]')].filter((row) => row.getAttribute('data-spec-stem') === stem);
    const row = rows.find((candidate) => path === undefined || candidate.getAttribute('data-spec-path') === path) ?? rows[0];
    row?.focus();
}

export function rescueFocus(fallback: () => void): void {
    queueMicrotask(() => {
        const active = document.activeElement;
        if (active !== null && active !== document.body && active.isConnected) {
            return;
        }
        if (!focusHeading()) {
            fallback();
        }
    });
}
