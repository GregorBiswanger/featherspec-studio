let opener: HTMLElement | undefined;

export function rememberOpener(element: HTMLElement | undefined): void {
    opener = element;
}

export function currentOpener(): HTMLElement | undefined {
    return opener;
}
