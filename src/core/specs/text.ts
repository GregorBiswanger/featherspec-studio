const UTF8 = new TextDecoder('utf-8', { fatal: true });

export class InvalidEncodingError extends Error {
    constructor() {
        super('not valid UTF-8');
        this.name = 'InvalidEncodingError';
    }
}

export function normalizeText(text: string): string {
    return text.replace(/\r\n?/g, '\n');
}

export function decodeText(bytes: Uint8Array): string {
    let decoded: string;
    try {
        decoded = UTF8.decode(bytes);
    } catch {
        throw new InvalidEncodingError();
    }
    return normalizeText(decoded);
}
