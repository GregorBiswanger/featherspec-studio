let opener: { element: HTMLElement; stem: string } | undefined;

export function rememberOpener(element: HTMLElement | undefined, stem: string): void {
    opener = element === undefined ? undefined : { element, stem };
}

export function currentOpener(stem: string): HTMLElement | undefined {
    return opener?.stem === stem ? opener.element : undefined;
}

export function forgetOpener(): void {
    opener = undefined;
}
