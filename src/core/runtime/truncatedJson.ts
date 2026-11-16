class EndOfText extends Error {}
class NotJson extends Error {}

const WHITESPACE = ' \t\r\n';
const SIMPLE_ESCAPES = '"\\/bfnrt';
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

export function isTruncatedJson(text: string): boolean {
    let at = 0;

    function peek(): string {
        if (at >= text.length) {
            throw new EndOfText();
        }
        return text[at]!;
    }

    function skip(): void {
        while (at < text.length && WHITESPACE.includes(text[at]!)) {
            at += 1;
        }
    }

    function literal(word: string): void {
        for (const expected of word) {
            if (peek() !== expected) {
                throw new NotJson();
            }
            at += 1;
        }
    }

    function string(): void {
        at += 1;
        for (;;) {
            const next = peek();
            at += 1;
            if (next === '"') {
                return;
            }
            if (next === '\\') {
                const escape = peek();
                at += 1;
                if (escape === 'u') {
                    for (let digit = 0; digit < 4; digit += 1) {
                        if (!/[0-9a-fA-F]/.test(peek())) {
                            throw new NotJson();
                        }
                        at += 1;
                    }
                } else if (!SIMPLE_ESCAPES.includes(escape)) {
                    throw new NotJson();
                }
            } else if (next < ' ') {
                throw new NotJson();
            }
        }
    }

    function number(): void {
        const start = at;
        while (at < text.length && /[0-9eE+\-.]/.test(text[at]!)) {
            at += 1;
        }
        if (at >= text.length) {
            throw new EndOfText();
        }
        if (!NUMBER.test(text.slice(start, at))) {
            throw new NotJson();
        }
    }

    function value(): void {
        skip();
        const next = peek();
        if (next === '{') {
            members('}', true);
        } else if (next === '[') {
            members(']', false);
        } else if (next === '"') {
            string();
        } else if (next === 't') {
            literal('true');
        } else if (next === 'f') {
            literal('false');
        } else if (next === 'n') {
            literal('null');
        } else if (next === '-' || (next >= '0' && next <= '9')) {
            number();
        } else {
            throw new NotJson();
        }
    }

    function members(close: string, keyed: boolean): void {
        at += 1;
        skip();
        if (peek() === close) {
            at += 1;
            return;
        }
        for (;;) {
            skip();
            if (keyed) {
                if (peek() !== '"') {
                    throw new NotJson();
                }
                string();
                skip();
                if (peek() !== ':') {
                    throw new NotJson();
                }
                at += 1;
            }
            value();
            skip();
            const next = peek();
            at += 1;
            if (next === close) {
                return;
            }
            if (next !== ',') {
                throw new NotJson();
            }
        }
    }

    try {
        skip();
        if (at >= text.length || text[at] !== '{') {
            return false;
        }
        members('}', true);
        return false;
    } catch (error) {
        if (error instanceof EndOfText) {
            return true;
        }
        if (error instanceof NotJson) {
            return false;
        }
        throw error;
    }
}
