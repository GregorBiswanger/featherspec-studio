export function isAbsolute(input) {
    return input.startsWith('/');
}

export function normalize(input) {
    if (input.length === 0) {
        return '.';
    }
    const absolute = isAbsolute(input);
    const trailing = input.endsWith('/');
    const segments = [];
    for (const part of input.split('/')) {
        if (part === '' || part === '.') {
            continue;
        }
        if (part === '..') {
            if (segments.length > 0 && segments[segments.length - 1] !== '..') {
                segments.pop();
            } else if (!absolute) {
                segments.push('..');
            }
            continue;
        }
        segments.push(part);
    }
    const body = segments.join('/');
    if (body.length === 0) {
        if (absolute) {
            return '/';
        }
        return trailing ? './' : '.';
    }
    const suffix = trailing ? '/' : '';
    return `${absolute ? '/' : ''}${body}${suffix}`;
}

export function join(...parts) {
    const joined = parts.filter((part) => part.length > 0).join('/');
    return joined.length === 0 ? '.' : normalize(joined);
}

export function dirname(input) {
    if (input.length === 0) {
        return '.';
    }
    const hasRoot = isAbsolute(input);
    let end = -1;
    let matchedSlash = true;
    for (let index = input.length - 1; index >= 1; index--) {
        if (input[index] === '/') {
            if (!matchedSlash) {
                end = index;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        return hasRoot ? '/' : '.';
    }
    if (hasRoot && end === 1) {
        return '//';
    }
    return input.slice(0, end);
}

export const posix = { dirname, isAbsolute, join, normalize };
