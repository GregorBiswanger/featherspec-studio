import { describe, expect, it } from 'vitest';
import { completeSettings, type SettingsResult } from './settingsJson';
import { realFile } from './testing/realRelease';

const enc = (text: string) => new TextEncoder().encode(text);
const dec = (bytes: Uint8Array) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);

function undo(result: Extract<SettingsResult, { kind: 'completed' }>): string {
    let text = dec(result.content);
    for (const insert of [...result.inserted].sort((first, second) => first.offset - second.offset)) {
        expect(text.slice(insert.offset, insert.offset + insert.text.length)).toBe(insert.text);
        text = text.slice(0, insert.offset) + text.slice(insert.offset + insert.text.length);
    }
    return text;
}

function complete(existing: string, release: string): string {
    const result = completeSettings(enc(existing), enc(release));
    if (result.kind !== 'completed') {
        throw new Error(`expected a completion, got ${result.kind}`);
    }
    expect(undo(result)).toBe(existing);
    return dec(result.content);
}

describe('0014 AC-013: completing .vscode/settings.json, the added keys', () => {
    it('adds a missing key before the closing brace in the indentation of the others', () => {
        expect(complete('{\n  "a": 1\n}\n', '{"x": true}')).toBe('{\n  "a": 1,\n  "x": true\n}\n');
    });

    it('adds several missing keys in release order', () => {
        expect(complete('{\n  "a": 0\n}', '{"x": 1, "a": 5, "y": 2}')).toBe('{\n  "a": 0,\n  "x": 1,\n  "y": 2\n}');
    });

    it('renders a missing object value with the indentation of the file', () => {
        expect(complete('{\n    "a": 1\n}\n', '{"o": {"p": 1, "q": [1, 2]}}')).toBe(
            '{\n    "a": 1,\n    "o": {\n        "p": 1,\n        "q": [\n            1,\n            2\n        ]\n    }\n}\n',
        );
    });

    it('uses tabs when the file does', () => {
        expect(complete('{\n\t"a": 1\n}\n', '{"o": {"p": 1}}')).toBe('{\n\t"a": 1,\n\t"o": {\n\t\t"p": 1\n\t}\n}\n');
    });

    it('adds a missing key at any depth, into a partial nested object, and changes no existing value', () => {
        const existing = '{\n  "o": {\n    "p": 9\n  }\n}\n';
        const result = completeSettings(enc(existing), enc('{"o": {"p": 1, "q": 2}}'));
        expect(result.kind).toBe('completed');
        if (result.kind === 'completed') {
            expect(dec(result.content)).toBe('{\n  "o": {\n    "p": 9,\n    "q": 2\n  }\n}\n');
            expect(result.keptKeys).toEqual(['o > p']);
            expect(undo(result)).toBe(existing);
        }
    });

    it('adds into a nested object three levels down', () => {
        expect(complete('{\n  "a": {\n    "b": {\n      "c": 1\n    }\n  }\n}', '{"a": {"b": {"c": 0, "d": 4}}}')).toBe(
            '{\n  "a": {\n    "b": {\n      "c": 1,\n      "d": 4\n    }\n  }\n}',
        );
    });

    it('keeps a trailing comma style: the new key gets one too', () => {
        expect(complete('{\n  "a": 1,\n}\n', '{"x": true}')).toBe('{\n  "a": 1,\n  "x": true,\n}\n');
    });

    it('keeps comments, also a comment at the end of the last line, and puts the comma before it', () => {
        const existing = '{\n  // mine\n  "a": 1 // note\n}\n';
        expect(complete(existing, '{"x": true}')).toBe('{\n  // mine\n  "a": 1, // note\n  "x": true\n}\n');
    });

    it('keeps a block comment after the last value', () => {
        expect(complete('{\n  "a": 1 /* why */\n}', '{"x": true}')).toBe('{\n  "a": 1, /* why */\n  "x": true\n}');
    });

    it('keeps CRLF line endings, taking the file\'s first line ending', () => {
        expect(complete('{\r\n  "a": 1\r\n}\r\n', '{"x": {"y": 1}}')).toBe('{\r\n  "a": 1,\r\n  "x": {\r\n    "y": 1\r\n  }\r\n}\r\n');
    });

    it('adds into an empty object', () => {
        expect(complete('{}', '{"x": true}')).toBe('{\n  "x": true\n}');
        expect(complete('{\n}\n', '{"x": true}')).toBe('{\n  "x": true\n}\n');
        expect(complete('{\n  // nothing yet\n}\n', '{"x": true}')).toBe('{\n  // nothing yet\n  "x": true\n}\n');
    });

    it('adds into an object written on one line', () => {
        expect(complete('{"a": 1}', '{"x": true}')).toBe('{"a": 1, "x": true}');
        expect(complete('{ "a": 1 }\n', '{"x": true}')).toBe('{ "a": 1, "x": true }\n');
    });

    it('keeps a byte order mark', () => {
        const existing = '\uFEFF{\n  "a": 1\n}\n';
        const result = completeSettings(enc(existing), enc('{"x": 1}'));
        expect(result.kind === 'completed' && [...result.content.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        expect(complete(existing, '{"x": 1}')).toBe('\uFEFF{\n  "a": 1,\n  "x": 1\n}\n');
    });

    it('does not mistake comment markers inside strings for comments', () => {
        const existing = '{\n  "url": "http://example.com/*x*/ // y",\n  "esc": "a\\"b"\n}\n';
        expect(complete(existing, '{"x": 1}')).toBe('{\n  "url": "http://example.com/*x*/ // y",\n  "esc": "a\\"b",\n  "x": 1\n}\n');
    });

    it('writes key and value as JSON text, so quotes and unicode in the release survive', () => {
        expect(complete('{}', '{"k\\"q": "ü — \\n"}')).toBe('{\n  "k\\"q": "ü — \\n"\n}');
    });

    it('works on the real settings.json of the 1.10.0 release: every key lands in an empty settings file', async () => {
        const real = dec((await realFile('.vscode/settings.json')).bytes);
        const text = complete('{}', real);
        expect(JSON.parse(text)).toEqual(JSON.parse(real));
    });

    it('works on the real settings.json: a user file with one release key gets the others and keeps its own', async () => {
        const real = dec((await realFile('.vscode/settings.json')).bytes);
        const existing = '{\n  "editor.tabSize": 4,\n  "chat.useClaudeMdFile": true,\n  "chat.promptFilesLocations": { "mine": true }\n}\n';
        const result = completeSettings(enc(existing), enc(real));
        expect(result.kind).toBe('completed');
        if (result.kind !== 'completed') {
            return;
        }
        const merged = JSON.parse(dec(result.content)) as Record<string, unknown>;
        const original = JSON.parse(real) as Record<string, unknown>;
        expect(merged['editor.tabSize']).toBe(4);
        expect(merged['chat.useClaudeMdFile']).toBe(true);
        expect(merged['chat.promptFilesLocations']).toEqual({ mine: true, '.github/prompts': true });
        expect(merged['chat.useAgentsMdFile']).toBe(true);
        expect(merged['chat.agentFilesLocations']).toEqual(original['chat.agentFilesLocations']);
        expect(result.keptKeys).toEqual(['chat.useClaudeMdFile']);
        expect(undo(result)).toBe(existing);
    });
});

describe('0014 AC-013: nothing to add, and kept values', () => {
    it('an existing value that differs is never changed and its key path is reported without the value', () => {
        const result = completeSettings(enc('{"x": false, "o": {"p": [1]}}'), enc('{"x": true, "o": {"p": [2]}}'));
        expect(result).toEqual({ kind: 'nothing-to-add', keptKeys: ['x', 'o > p'] });
    });

    it('an equal value, also an equal array or object, is not reported', () => {
        const result = completeSettings(enc('{"x": true, "o": {"p": [1, {"q": null}]}}'), enc('{"x": true, "o": {"p": [1, {"q": null}]}}'));
        expect(result).toEqual({ kind: 'nothing-to-add', keptKeys: [] });
    });

    it('a value of another type than the release object is kept and reported', () => {
        const result = completeSettings(enc('{"o": "text"}'), enc('{"o": {"p": 1}}'));
        expect(result).toEqual({ kind: 'nothing-to-add', keptKeys: ['o'] });
    });

    it('a superset of the release has nothing to add', () => {
        expect(completeSettings(enc('{"a": 1, "x": true, "o": {"p": 1, "z": 3}}'), enc('{"x": true, "o": {"p": 1}}')).kind).toBe('nothing-to-add');
    });
});

describe('0014 AC-013: a file that is not one JSON-with-comments object is kept', () => {
    it.each([
        ['empty', ''],
        ['only whitespace', '  \n'],
        ['only a comment', '// nothing\n'],
        ['an array', '[1, 2]'],
        ['a string', '"x"'],
        ['null', 'null'],
        ['an unclosed object', '{"a": 1'],
        ['a missing colon', '{"a" 1}'],
        ['a missing value', '{"a": }'],
        ['two commas', '{"a": 1,, "b": 2}'],
        ['a leading comma', '{, "a": 1}'],
        ['a key that is no string', '{a: 1}'],
        ['an unterminated string', '{"a": "x}'],
        ['an unterminated block comment', '{"a": 1} /* open'],
        ['a second object', '{"a": 1} {"b": 2}'],
        ['text after the object', '{"a": 1} x'],
        ['a bad escape', '{"a": "\\q"}'],
        ['a raw newline in a string', '{"a": "x\ny"}'],
        ['a bad number', '{"a": 01}'],
        ['a bad literal', '{"a": tru}'],
        ['invalid UTF-8', '\u0000'],
    ])('%s', (name, text) => {
        const bytes = name === 'invalid UTF-8' ? new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]) : enc(text);
        expect(completeSettings(bytes, enc('{"x": 1}'))).toEqual({ kind: 'not-an-object' });
    });

    it('negative control: the same shapes written validly are objects', () => {
        for (const text of ['{}', '{"a": 1}', '{"a": 1,}', '// c\n{"a": [1, 2.5e-3, true, null, "x"]} // end\n', '/* c */ {"a": {"b": {}}}']) {
            expect(completeSettings(enc(text), enc('{"x": 1}')).kind).toBe('completed');
        }
    });
});
