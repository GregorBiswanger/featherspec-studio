import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeUri {
    scheme: string;
    path: string;
    toString(): string;
}

const opened: string[] = [];
const statted: string[] = [];
const shown: { options: Record<string, unknown> }[] = [];
const tabs = vi.hoisted(() => {
    class FakeTabInputWebview {
        constructor(public viewType: string) {}
    }
    class FakeTabInputText {}
    return { FakeTabInputWebview, FakeTabInputText, active: undefined as { input: unknown } | undefined };
});
const { FakeTabInputWebview, FakeTabInputText } = tabs;

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
        TabInputWebview: tabs.FakeTabInputWebview,
        TabInputText: tabs.FakeTabInputText,
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
            tabGroups: { get activeTabGroup() { return { activeTab: tabs.active }; } },
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
        tabs.active = undefined;
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

    it('0020 AC-008: the active group shows the Studio panel: the file opens beside it', async () => {
        tabs.active = { input: new FakeTabInputWebview('mainThreadWebview-featherspecStudio.main') };
        await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 1, 'activeGroup');
        expect(shown[0]?.options.viewColumn).toBe(-2);
        expect(shown[0]?.options.preview).toBe(false);
    });

    it('0020 AC-008: the active group shows a text editor, another webview or nothing: the file opens in the active group', async () => {
        for (const tab of [{ input: new FakeTabInputText() }, { input: new FakeTabInputWebview('mainThreadWebview-other.view') }, undefined]) {
            tabs.active = tab;
            await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 1, 'activeGroup');
        }
        expect(shown.map((entry) => entry.options.viewColumn)).toEqual([-1, -1, -1]);
        expect(shown.every((entry) => entry.options.preview === false)).toBe(true);
    });

    it('0020 AC-008: without a place the file opens beside, as 0019 left it, even over a text editor', async () => {
        tabs.active = { input: new FakeTabInputText() };
        await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 1);
        await createEditor().open('file:///c%3A/proj/app', '.specs/active/0001-a.md', 1, 'beside');
        expect(shown.map((entry) => entry.options.viewColumn)).toEqual([-2, -2]);
    });
});
