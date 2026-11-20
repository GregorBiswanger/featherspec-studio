class TextDecoderPolyfill {
    constructor(label = 'utf-8', options = {}) {
        const name = String(label).trim().toLowerCase();
        if (name !== 'utf-8' && name !== 'utf8' && name !== 'unicode-1-1-utf-8') {
            throw new RangeError(`unsupported encoding: ${label}`);
        }
        this.encoding = 'utf-8';
        this.fatal = options.fatal === true;
        this.ignoreBOM = options.ignoreBOM === true;
    }

    decode(input = new Uint8Array(0)) {
        const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        const text = decodeUtf8(bytes, this.fatal);
        return !this.ignoreBOM && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    }
}

function decodeUtf8(bytes, fatal) {
    let text = '';
    let codePoint = 0;
    let needed = 0;
    let lower = 0x80;
    let upper = 0xbf;
    const fail = () => {
        if (fatal) {
            throw new TypeError('The encoded data was not valid for encoding utf-8');
        }
        text += '�';
    };
    for (let index = 0; index < bytes.length; index++) {
        const byte = bytes[index];
        if (needed === 0) {
            lower = 0x80;
            upper = 0xbf;
            if (byte <= 0x7f) {
                text += String.fromCharCode(byte);
            } else if (byte >= 0xc2 && byte <= 0xdf) {
                needed = 1;
                codePoint = byte & 0x1f;
            } else if (byte >= 0xe0 && byte <= 0xef) {
                if (byte === 0xe0) {
                    lower = 0xa0;
                }
                if (byte === 0xed) {
                    upper = 0x9f;
                }
                needed = 2;
                codePoint = byte & 0x0f;
            } else if (byte >= 0xf0 && byte <= 0xf4) {
                if (byte === 0xf0) {
                    lower = 0x90;
                }
                if (byte === 0xf4) {
                    upper = 0x8f;
                }
                needed = 3;
                codePoint = byte & 0x07;
            } else {
                fail();
            }
            continue;
        }
        if (byte < lower || byte > upper) {
            needed = 0;
            codePoint = 0;
            fail();
            index--;
            continue;
        }
        lower = 0x80;
        upper = 0xbf;
        codePoint = (codePoint << 6) | (byte & 0x3f);
        needed--;
        if (needed === 0) {
            text += String.fromCodePoint(codePoint);
        }
    }
    if (needed !== 0) {
        fail();
    }
    return text;
}

class TextEncoderPolyfill {
    get encoding() {
        return 'utf-8';
    }

    encode(input = '') {
        const bytes = [];
        for (const char of String(input)) {
            let codePoint = char.codePointAt(0);
            if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
                codePoint = 0xfffd;
            }
            if (codePoint < 0x80) {
                bytes.push(codePoint);
            } else if (codePoint < 0x800) {
                bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
            } else if (codePoint < 0x10000) {
                bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
            } else {
                bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
            }
        }
        return new Uint8Array(bytes);
    }
}

if (typeof globalThis.TextDecoder === 'undefined') {
    globalThis.TextDecoder = TextDecoderPolyfill;
}

if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = TextEncoderPolyfill;
}

if (typeof globalThis.queueMicrotask === 'undefined') {
    globalThis.queueMicrotask = (callback) => {
        Promise.resolve().then(callback);
    };
}
