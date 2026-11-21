import { describe, expect, it } from 'vitest';
import type { OutputPort, SelectItem, UiPort } from '../../core/ports/host';
import type { SetupUiPort } from '../../core/ports/setupUi';
import type { StatusEntryView, StatusItemPort, StepUiPort } from '../../core/ports/copyNextStep';
import type { SpecTreeModel } from '../../core/shell/specTree';
import { translatedPorts, translateStatus, translateTree, type TermPorts } from './terms';

const RESTRICTED = 'This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace.';
const NOT_TRUSTED = 'This project is not trusted. Setting up FeatherSpec needs a trusted project.';

interface Recorded {
    shown: unknown[];
}

function fakePorts(record: Recorded, chosen?: string): TermPorts & { setupUi: SetupUiPort } {
    const ui: UiPort = {
        showQuickPick: async (items: readonly SelectItem[]) => {
            record.shown.push(items);
            return items[1];
        },
        showNotification: async (model) => {
            record.shown.push(model);
            return undefined;
        },
        openExternal: async () => undefined,
    };
    const setupUi: SetupUiPort = {
        pickTarget: async () => undefined,
        confirm: async (model) => {
            record.shown.push(model);
            return true;
        },
        withProgress: async (title, task) => {
            record.shown.push(title);
            return task(new AbortController().signal);
        },
        notify: async (message, actions) => {
            record.shown.push({ message, actions });
            return chosen;
        },
        copy: async () => undefined,
    };
    const stepUi: StepUiPort = {
        pick: async () => undefined,
        inform: async (text, action) => {
            record.shown.push({ text, action });
            return action;
        },
        warn: (text) => {
            record.shown.push(text);
        },
    };
    const output: OutputPort = {
        appendBlock: (lines) => {
            record.shown.push(lines);
        },
    };
    const statusItem: StatusItemPort = {
        show: (view: StatusEntryView) => {
            record.shown.push(view);
        },
        hide: () => undefined,
    };
    return { ui, setupUi, stepUi, output, statusItem };
}

describe('embedded terms (§6.8, AC-023: JetBrains wording on the outbound strings)', () => {
    it('AC-019, AC-023: the setup notification reads the JetBrains wording and a chosen action maps back to the VS Code label', async () => {
        const record: Recorded = { shown: [] };
        const ports = translatedPorts(fakePorts(record, 'Trust Project'));
        const chosen = await ports.setupUi.notify(RESTRICTED, ['Manage Workspace Trust']);
        expect(chosen).toBe('Manage Workspace Trust');
        expect(record.shown).toEqual([{ message: NOT_TRUSTED, actions: ['Trust Project'] }]);
    });

    it('AC-023: a quick pick returns the original item object, not the translated copy', async () => {
        const record: Recorded = { shown: [] };
        const ports = translatedPorts(fakePorts(record));
        const items: SelectItem[] = [
            { label: 'a', description: '', detail: '', root: 'file:///a' },
            { label: 'Every folder of this workspace', description: '', detail: '', root: 'file:///b' },
        ];
        const picked = await ports.ui.showQuickPick(items);
        expect(picked).toBe(items[1]);
        expect(record.shown[0]).toEqual([items[0], { ...items[1], label: 'Every folder of this project' }]);
    });

    it('AC-023: the confirm model, the progress title, the warnings and the log lines are translated', async () => {
        const record: Recorded = { shown: [] };
        const ports = translatedPorts(fakePorts(record));
        await ports.setupUi.confirm({ message: RESTRICTED, detail: 'Restricted Mode', confirmLabel: 'Manage Workspace Trust' });
        await ports.setupUi.withProgress('Restricted Mode', async () => undefined);
        ports.stepUi.warn(RESTRICTED);
        ports.output.appendBlock(['No FeatherSpec project found in this workspace.']);
        expect(record.shown).toEqual([
            { message: NOT_TRUSTED, detail: 'Safe Mode', confirmLabel: 'Trust Project' },
            'Safe Mode',
            NOT_TRUSTED,
            ['No FeatherSpec project found in this project.'],
        ]);
    });

    it('§6.8: the status view translates its text, plain tooltip and accessible label, and a markdown tooltip too', () => {
        const plain: StatusEntryView = { text: 'FeatherSpec: No FeatherSpec project found in this workspace', tooltip: { plain: RESTRICTED }, accessibleLabel: 'Restricted Mode', command: 'selectProject' };
        expect(translateStatus(plain)).toEqual({ text: 'FeatherSpec: No FeatherSpec project found in this project', tooltip: { plain: NOT_TRUSTED }, accessibleLabel: 'Safe Mode', command: 'selectProject' });
        const markdown: StatusEntryView = { text: 'FeatherSpec', tooltip: { markdown: RESTRICTED }, command: 'copyNextStep' };
        expect(translateStatus(markdown)).toEqual({ text: 'FeatherSpec', tooltip: { markdown: NOT_TRUSTED }, command: 'copyNextStep' });
    });

    it('§6.8: the tree translates its message, group and row texts and action labels; ids, stems and paths stay', () => {
        const model: SpecTreeModel = {
            message: 'Every folder of this workspace has no spec.',
            items: [
                {
                    kind: 'group',
                    id: 'group:ready',
                    label: 'Ready',
                    description: 'Restricted Mode',
                    collapsed: false,
                    tooltip: RESTRICTED,
                    children: [
                        {
                            kind: 'spec',
                            id: 'spec:0001',
                            label: '0001 A spec',
                            description: 'Draft',
                            icon: 'file',
                            color: 'red',
                            accessibleLabel: 'Restricted Mode',
                            tooltip: 'No FeatherSpec project found in this workspace',
                            contextValue: 'spec',
                            stem: '0001-a-spec',
                            path: '.specs/active/0001-a-spec.md',
                            specKey: 'spec:0001',
                            state: 'Active',
                        },
                    ],
                },
                { kind: 'action', label: 'Manage Workspace Trust', action: 'openFolder', icon: 'shield' },
            ],
        };
        const translated = translateTree(model);
        expect(translated.message).toBe('Every folder of this project has no spec.');
        expect(translated.items[0]).toMatchObject({ label: 'Ready', description: 'Safe Mode', tooltip: NOT_TRUSTED });
        expect(translated.items[0]).toMatchObject({
            children: [{ id: 'spec:0001', stem: '0001-a-spec', path: '.specs/active/0001-a-spec.md', accessibleLabel: 'Safe Mode', tooltip: 'No FeatherSpec project found in this project' }],
        });
        expect(translated.items[1]).toMatchObject({ label: 'Trust Project', action: 'openFolder' });
    });
});
