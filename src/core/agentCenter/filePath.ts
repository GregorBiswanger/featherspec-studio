import * as path from 'path';

export function projectRelativeKey(value: string): string | undefined {
    const slashed = value.replace(/\\/g, '/');
    if (slashed === '' || slashed.startsWith('/') || /^[A-Za-z]:/.test(slashed)) {
        return undefined;
    }
    const normalized = path.posix.normalize(slashed);
    if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
        return undefined;
    }
    return normalized;
}
