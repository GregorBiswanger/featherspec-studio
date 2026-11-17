export type JsoncValue = JsoncObject | JsoncArray | JsoncScalar;

export interface JsoncMember {
    key: string;
    keyStart: number;
    value: JsoncValue;
    commaAfter: number | undefined;
}

export interface JsoncObject {
    kind: 'object';
    start: number;
    end: number;
    members: JsoncMember[];
}

export interface JsoncArray {
    kind: 'array';
    start: number;
    end: number;
    items: JsoncValue[];
}

export interface JsoncScalar {
    kind: 'scalar';
    start: number;
    end: number;
    value: string | number | boolean | null;
}

class JsoncError extends Error {}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const LITERALS: ReadonlyMap<string, boolean | null> = new Map([
    ['true', true],
    ['false', false],
    ['null', null],
]);

class Scanner {
    position = 0;

    constructor(readonly text: string) {}

    fail(message: string): never {
        throw new JsoncError(`${message} at ${this.position}`);
    }

    trivia(): void {
        const { text } = this;
        if (this.position === 0 && text.charCodeAt(0) === 0xfeff) {
            this.position = 1;
        }
        for (;;) {
            const char = text[this.position];
            if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                this.position += 1;
            } else if (char === '/' && text[this.position + 1] === '/') {
                const newline = text.slice(this.position).search(/[\r\n]/);
                this.position = newline === -1 ? text.length : this.position + newline;
            } else if (char === '/' && text[this.position + 1] === '*') {
                const close = text.indexOf('*/', this.position + 2);
                if (close === -1) {
                    this.fail('unterminated comment');
                }
                this.position = close + 2;
            } else {
                return;
            }
        }
    }

    string(): JsoncScalar {
        const start = this.position;
        const { text } = this;
        this.position += 1;
        for (;;) {
            const char = text[this.position];
            if (char === undefined || char < ' ') {
                this.fail('unterminated string');
            }
            if (char === '"') {
                this.position += 1;
                return { kind: 'scalar', start, end: this.position, value: JSON.parse(text.slice(start, this.position)) as string };
            }
            if (char === '\\') {
                const escape = text[this.position + 1];
                if (escape === 'u') {
                    if (!/^[0-9a-fA-F]{4}$/.test(text.slice(this.position + 2, this.position + 6))) {
                        this.fail('bad escape');
                    }
                    this.position += 6;
                } else if (escape !== undefined && '"\\/bfnrt'.includes(escape)) {
                    this.position += 2;
                } else {
                    this.fail('bad escape');
                }
            } else {
                this.position += 1;
            }
        }
    }

    value(): JsoncValue {
        const char = this.text[this.position];
        if (char === '{') {
            return this.object();
        }
        if (char === '[') {
            return this.array();
        }
        if (char === '"') {
            return this.string();
        }
        const start = this.position;
        NUMBER.lastIndex = start;
        const number = NUMBER.exec(this.text);
        if (number !== null) {
            this.position = start + number[0].length;
            return { kind: 'scalar', start, end: this.position, value: Number(number[0]) };
        }
        const word = /^[A-Za-z]+/.exec(this.text.slice(start))?.[0] ?? '';
        if (LITERALS.has(word)) {
            this.position = start + word.length;
            return { kind: 'scalar', start, end: this.position, value: LITERALS.get(word) ?? null };
        }
        return this.fail('unexpected character');
    }

    object(): JsoncObject {
        const start = this.position;
        const members: JsoncMember[] = [];
        this.position += 1;
        for (;;) {
            this.trivia();
            if (this.text[this.position] === '}') {
                this.position += 1;
                return { kind: 'object', start, end: this.position, members };
            }
            if (this.text[this.position] !== '"') {
                this.fail('expected a key');
            }
            const keyStart = this.position;
            const key = this.string().value as string;
            this.trivia();
            if (this.text[this.position] !== ':') {
                this.fail('expected a colon');
            }
            this.position += 1;
            this.trivia();
            const value = this.value();
            const member: JsoncMember = { key, keyStart, value, commaAfter: undefined };
            members.push(member);
            this.trivia();
            const next = this.text[this.position];
            if (next === ',') {
                member.commaAfter = this.position;
                this.position += 1;
            } else if (next !== '}') {
                this.fail('expected a comma or a closing brace');
            }
        }
    }

    array(): JsoncArray {
        const start = this.position;
        const items: JsoncValue[] = [];
        this.position += 1;
        for (;;) {
            this.trivia();
            if (this.text[this.position] === ']') {
                this.position += 1;
                return { kind: 'array', start, end: this.position, items };
            }
            items.push(this.value());
            this.trivia();
            const next = this.text[this.position];
            if (next === ',') {
                this.position += 1;
            } else if (next !== ']') {
                this.fail('expected a comma or a closing bracket');
            }
        }
    }
}

export function parseJsoncObject(text: string): JsoncObject | undefined {
    const scanner = new Scanner(text);
    try {
        scanner.trivia();
        if (text[scanner.position] !== '{') {
            return undefined;
        }
        const root = scanner.object();
        scanner.trivia();
        return scanner.position === text.length ? root : undefined;
    } catch (error) {
        if (error instanceof JsoncError) {
            return undefined;
        }
        throw error;
    }
}

export type PlainValue = string | number | boolean | null | PlainValue[] | { [key: string]: PlainValue };

export function plainValue(node: JsoncValue): PlainValue {
    switch (node.kind) {
        case 'scalar':
            return node.value;
        case 'array':
            return node.items.map(plainValue);
        case 'object': {
            const result: { [key: string]: PlainValue } = {};
            for (const member of node.members) {
                result[member.key] = plainValue(member.value);
            }
            return result;
        }
    }
}

export function samePlainValue(first: PlainValue, second: PlainValue): boolean {
    if (first === second) {
        return true;
    }
    if (Array.isArray(first) || Array.isArray(second)) {
        return Array.isArray(first) && Array.isArray(second) && first.length === second.length && first.every((item, index) => samePlainValue(item, second[index] ?? null));
    }
    if (first !== null && second !== null && typeof first === 'object' && typeof second === 'object') {
        const firstKeys = Object.keys(first);
        return firstKeys.length === Object.keys(second).length && firstKeys.every((key) => key in second && samePlainValue(first[key] ?? null, second[key] ?? null));
    }
    return false;
}
