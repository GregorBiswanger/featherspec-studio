import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpecTreeModel } from '../../core/shell/specTree';

interface FakeTreeView {
    message: string | undefined;
    badge: { value: number; tooltip: string } | undefined;
    description: string | undefined;
    disposed: boolean;
    dispose(): void;
}

const state = vi.hoisted(() => ({
    views: [] as Array<{ id: string; options: { treeDataProvider: unknown }; view: FakeTreeView }>,
    contexts: [] as Array<[string, unknown]>,
    fired: 0,
}));

vi.mock('vscode', () => {
    class TreeItem {
        id: string | undefined;
        description: string | undefined;
        iconPath: unknown;
        tooltip: unknown;
        accessibilityInformation: unknown;
        contextValue: string | undefined;
        command: unknown;
        constructor(
            public label: string,
            public collapsibleState: number,
        ) {}
    }
    class ThemeIcon {
        constructor(
            public id: string,
            public color?: unknown,
        ) {}
    }
    class ThemeColor {
        constructor(public id: string) {}
    }
    class MarkdownString {
        isTrusted: unknown = undefined;
        supportThemeIcons = true;
        supportHtml = true;
        constructor(public value: string) {}
    }
    class EventEmitter<T> {
        listeners: Array<(value: T) => void> = [];
        event = (listener: (value: T) => void) => {
            this.listeners.push(listener);
            return { dispose: () => undefined };
        };
        fire(value: T) {
            state.fired += 1;
            this.listeners.forEach((listener) => listener(value));
        }
        dispose() {}
    }
    return {
        TreeItem,
        ThemeIcon,
        ThemeColor,
        MarkdownString,
        EventEmitter,
        TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
        window: {
            createTreeView: (id: string, options: { treeDataProvider: unknown }) => {
                const view: FakeTreeView = { message: undefined, badge: undefined, description: undefined, disposed: false, dispose: () => void (view.disposed = true) };
                state.views.push({ id, options, view });
                return view;
            },
        },
        commands: {
            executeCommand: (command: string, ...args: unknown[]) => {
                if (command === 'setContext') {
                    state.contexts.push([String(args[0]), args[1]]);
                }
                return Promise.resolve();
            },
        },
    };
});

import { createStudioTree } from './studioTree';

const ROW = {
    kind: 'spec' as const,
    id: '["spec","r","0004-r"]',
    label: '0004 Reviewing',
    description: 'Review · /sdd-compile',
    icon: 'eye',
    color: 'charts.yellow',
    accessibleLabel: '0004 Reviewing, Review · /sdd-compile',
    tooltip: '**0004 Reviewing**',
    contextValue: 'spec step plan',
    stem: '0004-r',
    line: '/sdd-compile x',
    planKey: '.specs/active/0004-r.plan.md',
    specKey: '.specs/active/0004-r.md',
    state: 'Review' as const,
};

function fakeService(initial: SpecTreeModel) {
    let model = initial;
    const listeners: Array<(model: SpecTreeModel) => void> = [];
    return {
        model: () => model,
        onDidChange: (listener: (model: SpecTreeModel) => void) => {
            listeners.push(listener);
            return { dispose: () => undefined };
        },
        dispose: () => undefined,
        push(next: SpecTreeModel) {
            model = next;
            listeners.forEach((listener) => listener(next));
        },
    };
}

interface Provider {
    getTreeItem(element: unknown): Record<string, unknown>;
    getChildren(element?: unknown): unknown[];
}

function providerOf(): Provider {
    return state.views[0]!.options.treeDataProvider as Provider;
}

const WITH_ROWS: SpecTreeModel = {
    message: undefined,
    items: [{ kind: 'group', id: 'group:inProgress', label: 'In progress', description: '1', collapsed: false, children: [ROW] }, { kind: 'group', id: 'group:done', label: 'Done', description: '2', collapsed: true, children: [] }],
    badge: { value: 1, tooltip: '1 spec waits for you: 1 in Review' },
};

describe('0020: the Specs view adapter', () => {
    beforeEach(() => {
        state.views.length = 0;
        state.contexts.length = 0;
        state.fired = 0;
    });

    it('AC-011: the view keeps its ID', () => {
        createStudioTree(fakeService(WITH_ROWS));
        expect(state.views.map((view) => view.id)).toEqual(['featherspec-studio.navigator']);
    });

    it('AC-002: a group maps to an item with its ID, its count and Expanded or Collapsed', () => {
        createStudioTree(fakeService(WITH_ROWS));
        const [open, done] = providerOf().getChildren() as Array<Record<string, unknown>>;
        expect(providerOf().getTreeItem(open)).toMatchObject({ id: 'group:inProgress', label: 'In progress', description: '1', collapsibleState: 2 });
        expect(providerOf().getTreeItem(done)).toMatchObject({ id: 'group:done', label: 'Done', description: '2', collapsibleState: 1 });
        expect(providerOf().getChildren(open)).toEqual([ROW]);
    });

    it('AC-004, AC-005, AC-006: a spec row maps to its ID, texts, themed icon with colour, an untrusted Markdown tooltip, accessible label and contextValue', () => {
        createStudioTree(fakeService(WITH_ROWS));
        const item = providerOf().getTreeItem(ROW) as Record<string, unknown> & { iconPath: { id: string; color: { id: string } }; tooltip: { value: string; isTrusted: unknown; supportHtml: boolean; supportThemeIcons: boolean } };
        expect(item).toMatchObject({ id: ROW.id, label: ROW.label, description: ROW.description, collapsibleState: 0, contextValue: 'spec step plan', accessibilityInformation: { label: ROW.accessibleLabel } });
        expect(item.iconPath.id).toBe('eye');
        expect(item.iconPath.color.id).toBe('charts.yellow');
        expect(item.tooltip.value).toBe('**0004 Reviewing**');
        expect(item.tooltip.isTrusted).toBe(false);
        expect(item.tooltip.supportHtml).toBe(false);
        expect(item.tooltip.supportThemeIcons).toBe(false);
    });

    it('AC-009: activating a row runs Select Spec with the stem, and the path only while the stem is duplicated', () => {
        createStudioTree(fakeService(WITH_ROWS));
        const plain = providerOf().getTreeItem(ROW).command;
        const twin = providerOf().getTreeItem({ ...ROW, path: '.specs/active/0004-r.md' }).command;
        expect(plain).toEqual({ command: 'featherspec-studio.selectSpec', title: 'Select Spec', arguments: [{ stem: '0004-r' }] });
        expect(twin).toEqual({ command: 'featherspec-studio.selectSpec', title: 'Select Spec', arguments: [{ stem: '0004-r', path: '.specs/active/0004-r.md' }] });
    });

    it('AC-012: an action row keeps its command and an icon without colour; a group has no command and no icon; a spec row runs Select Spec, not the shell action', () => {
        createStudioTree(fakeService({ message: undefined, items: [{ kind: 'action', label: 'Retry', action: 'retry', icon: 'play' }, WITH_ROWS.items[0]!] }));
        const [action, group] = providerOf().getChildren() as Array<Record<string, unknown>>;
        const actionItem = providerOf().getTreeItem(action) as Record<string, unknown> & { iconPath: { id: string; color: unknown } };
        expect(actionItem).toMatchObject({ label: 'Retry', command: { command: 'featherspec-studio.shellAction', arguments: ['retry'] } });
        expect(actionItem.iconPath.id).toBe('play');
        expect(actionItem.iconPath.color).toBeUndefined();
        expect(providerOf().getChildren(action)).toEqual([]);
        const groupItem = providerOf().getTreeItem(group);
        expect(groupItem.command).toBeUndefined();
        expect(groupItem.iconPath).toBeUndefined();
        const rowItem = providerOf().getTreeItem(ROW) as { command: { command: string }; iconPath: { color: unknown } };
        expect(rowItem.command.command).toBe('featherspec-studio.selectSpec');
        expect(rowItem.iconPath.color).toBeDefined();
    });

    it('AC-010, AC-011, AC-012: the view shows the message, the badge and the description of the model, and sets the S2 context', () => {
        const service = fakeService(WITH_ROWS);
        createStudioTree(service);
        const view = state.views[0]!.view;
        expect(view.badge).toEqual({ value: 1, tooltip: '1 spec waits for you: 1 in Review' });
        expect(view.message).toBeUndefined();
        expect(state.contexts.at(-1)).toEqual(['featherspec-studio.panelState', '']);
        service.push({ message: 'Loading project…', items: [], description: 'demo' });
        expect(view.message).toBe('Loading project…');
        expect(view.badge).toBeUndefined();
        expect(view.description).toBe('demo');
        service.push({ message: undefined, items: [], welcome: 'S2' });
        expect(state.contexts.at(-1)).toEqual(['featherspec-studio.panelState', 'S2']);
    });

    it('AC-013: a model change refreshes the tree once, and dispose closes the view', () => {
        const service = fakeService(WITH_ROWS);
        const tree = createStudioTree(service);
        service.push({ ...WITH_ROWS, badge: undefined });
        expect(state.fired).toBe(1);
        expect(tree.model().badge).toBeUndefined();
        tree.dispose();
        expect(state.views[0]!.view.disposed).toBe(true);
    });
});
