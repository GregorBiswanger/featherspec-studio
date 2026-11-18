import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeUri {
    scheme: string;
    path: string;
    toString(): string;
}

const opened: string[] = [];
const statted: string[] = [];
const shown: { options: Record<string, unknown> }[] = [];

vi.mock('vscode', () => {
    const make = (scheme: string, path: string): FakeUri => ({ scheme, path, toString: () => `${scheme}://${path}` });
    return {
        Uri: {
            parse: (value: string) => {
                const match = /^([a-z]+):\/\/(.*)$/.exec(value);
                return make(match?.[1] ?? 'file', match?.[2] ?? value);
            },
            file: (value: string) => make('file', value.startsWith('/') ? value : `/${value}`),
            joinPath: (base: FakeUri, ...parts: string[]) => make(base.scheme, [base.path, ...parts].join('/')),
        },
        Position: class {
            constructor(
                public line: number,
                public character: number,
            ) {}
        },
        Range: class {
            constructor(
                public start: unknown,
                public end: unknown,
            ) {}
        },
        ViewColumn: { Active: -1, Beside: -2 },
        workspace: {
            fs: {
                stat: (uri: FakeUri) => {
                    statted.push(uri.toString());
                    return uri.scheme === 'file' && uri.path.startsWith('/c%3A/') ? Promise.resolve({}) : Promise.reject(new Error('FileNotFound'));
                },
            },
            openTextDocument: (uri: FakeUri) => {
                opened.push(uri.toString());
                return Promise.resolve({ uri });
            },
        },
        window: {
            showTextDocument: (_document: unknown, options: Record<string, unknown>) => {
                shown.push({ options });
                return Promise.resolve(undefined);
            },
        },
    };
});

import { createEditor } from './editor';

describe('createEditor', () => {
    beforeEach(() => {
        opened.length = 0;
        statted.length = 0;
        shown.length = 0;
    });

    it('AC-010: the project root arrives as a URI string, and the spec opens below that URI', async () => {
        const outcome = await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 5);
        expect(statted).toEqual(['file:///c%3A/proj/app/.specs/active/0001-a.md']);
        expect(opened).toEqual(['file:///c%3A/proj/app/.specs/active/0001-a.md']);
        expect(outcome).toBe('opened');
    });

    it('AC-010: a file that does not exist is reported as not found and nothing is opened', async () => {
        expect(await createEditor().open('file:///d%3A/other', '.specs/active/0001-a.md')).toBe('not-found');
        expect(opened).toEqual([]);
    });

    it('0019 AC-018: the file opens beside the Studio, not as preview, without preserveFocus, with the cursor at the start of the line', async () => {
        await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 94);
        expect(shown).toHaveLength(1);
        const options = shown[0]?.options ?? {};
        expect(options.viewColumn).toBe(-2);
        expect(options.preview).toBe(false);
        expect('preserveFocus' in options).toBe(false);
        expect(options.selection).toEqual({ start: { line: 93, character: 0 }, end: { line: 93, character: 0 } });
    });

    it('0019 AC-018: without a line the cursor is at the start of the file (control: line 1 gives the same)', async () => {
        await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md');
        await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 1);
        expect(shown[0]?.options.viewColumn).toBe(-2);
        expect(shown[0]?.options.selection).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } });
        expect(shown[1]?.options.selection).toEqual(shown[0]?.options.selection);
    });

    it('0019 AC-018: a file that is not found shows no editor (negative control for the recorded options)', async () => {
        await createEditor().open('file:///d%3A/other', '.specs/active/0001-a.md', 5);
        expect(shown).toEqual([]);
    });
});
