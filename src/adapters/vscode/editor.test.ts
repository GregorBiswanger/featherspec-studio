import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeUri {
    scheme: string;
    path: string;
    toString(): string;
}

const opened: string[] = [];
const statted: string[] = [];

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
        window: { showTextDocument: () => Promise.resolve(undefined) },
    };
});

import { createEditor } from './editor';

describe('createEditor', () => {
    beforeEach(() => {
        opened.length = 0;
        statted.length = 0;
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
});
