export function sameRootFor(platform: string): (first: string, second: string) => boolean {
    return platform === 'win32'
        ? (first, second) => first.toLowerCase() === second.toLowerCase()
        : (first, second) => first === second;
}
