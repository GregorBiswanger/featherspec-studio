export function isCaseInsensitivePlatform(platform: string): boolean {
    return platform === 'win32' || platform === 'darwin';
}

function decodeSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

export function eventRelativePath(rootUri: string, eventUri: string, platform: string): string | undefined {
    const fold = isCaseInsensitivePlatform(platform) ? (value: string) => value.toLowerCase() : (value: string) => value;
    const root = rootUri.replace(/\/+$/, '');
    if (fold(eventUri) === fold(root)) {
        return '';
    }
    if (!fold(eventUri).startsWith(`${fold(root)}/`)) {
        return undefined;
    }
    return eventUri
        .slice(root.length + 1)
        .split('/')
        .map(decodeSegment)
        .join('/');
}
