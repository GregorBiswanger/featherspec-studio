import type { OutputPort, SelectItem, UiPort } from '../../core/ports/host';
import type { SetupPickItem, SetupUiPort } from '../../core/ports/setupUi';
import type { StatusEntryView, StatusItemPort, StatusTooltip, StepPickItem, StepUiPort } from '../../core/ports/copyNextStep';
import type { GroupModel, SpecRowModel, SpecTreeModel, TreeItemModel } from '../../core/shell/specTree';
import { translateTerms } from '../../shared/protocol/vocabulary';

export interface TermPorts {
    ui: UiPort;
    setupUi: SetupUiPort;
    stepUi: StepUiPort;
    output: OutputPort;
    statusItem: StatusItemPort;
}

export function jetBrainsText(text: string): string {
    return translateTerms(text, 'jetbrains');
}

function optional(text: string | undefined): string | undefined {
    return text === undefined ? undefined : jetBrainsText(text);
}

async function pickOriginal<T>(items: readonly T[], translate: (item: T) => T, pick: (translated: readonly T[]) => Promise<T | undefined>): Promise<T | undefined> {
    const translated = items.map(translate);
    const picked = await pick(translated);
    const index = picked === undefined ? -1 : translated.indexOf(picked);
    return index < 0 ? undefined : items[index];
}

function translateSelectItem(item: SelectItem): SelectItem {
    return { ...item, label: jetBrainsText(item.label), description: jetBrainsText(item.description), detail: jetBrainsText(item.detail) };
}

function translateSetupItem(item: SetupPickItem): SetupPickItem {
    return { ...item, label: jetBrainsText(item.label), description: jetBrainsText(item.description), detail: jetBrainsText(item.detail) };
}

function translateStepItem(item: StepPickItem): StepPickItem {
    return { ...item, label: jetBrainsText(item.label), description: jetBrainsText(item.description) };
}

function translatedUi(inner: UiPort): UiPort {
    return {
        showQuickPick: (items) => pickOriginal(items, translateSelectItem, (translated) => inner.showQuickPick(translated)),
        showNotification: (model) => inner.showNotification({ ...model, message: jetBrainsText(model.message) }),
        openExternal: (url) => inner.openExternal(url),
    };
}

function translatedSetupUi(inner: SetupUiPort): SetupUiPort {
    return {
        pickTarget: (items, placeholder) => inner.pickTarget(items.map(translateSetupItem), jetBrainsText(placeholder)),
        confirm: (model) => inner.confirm({ message: jetBrainsText(model.message), detail: jetBrainsText(model.detail), confirmLabel: jetBrainsText(model.confirmLabel) }),
        withProgress: (title, task) => inner.withProgress(jetBrainsText(title), task),
        notify: (message, actions) => pickOriginal(actions, jetBrainsText, (translated) => inner.notify(jetBrainsText(message), translated)),
        copy: (text) => inner.copy(text),
    };
}

function translatedStepUi(inner: StepUiPort): StepUiPort {
    return {
        pick: (items, placeholder) => pickOriginal(items, translateStepItem, (translated) => inner.pick(translated, jetBrainsText(placeholder))),
        inform: async (text, action) => {
            const chosen = await inner.inform(jetBrainsText(text), jetBrainsText(action));
            return chosen === undefined ? undefined : action;
        },
        warn: (text) => inner.warn(jetBrainsText(text)),
    };
}

function translateTooltip(tooltip: StatusTooltip): StatusTooltip {
    return 'markdown' in tooltip ? { markdown: jetBrainsText(tooltip.markdown) } : { plain: jetBrainsText(tooltip.plain) };
}

export function translateStatus(view: StatusEntryView): StatusEntryView {
    return {
        ...view,
        text: jetBrainsText(view.text),
        tooltip: translateTooltip(view.tooltip),
        ...(view.accessibleLabel === undefined ? {} : { accessibleLabel: jetBrainsText(view.accessibleLabel) }),
    };
}

export function translatedPorts<P extends TermPorts>(ports: P): P {
    const { ui, setupUi, stepUi, output, statusItem } = ports;
    return {
        ...ports,
        ui: translatedUi(ui),
        setupUi: translatedSetupUi(setupUi),
        stepUi: translatedStepUi(stepUi),
        output: { ...output, appendBlock: (lines) => output.appendBlock(lines.map(jetBrainsText)) },
        statusItem: { ...statusItem, show: (view) => statusItem.show(translateStatus(view)) },
    };
}

function translateRow(row: SpecRowModel): SpecRowModel {
    return { ...row, description: jetBrainsText(row.description), tooltip: jetBrainsText(row.tooltip), accessibleLabel: jetBrainsText(row.accessibleLabel) };
}

function translateGroup(group: GroupModel): GroupModel {
    return {
        ...group,
        label: jetBrainsText(group.label),
        description: jetBrainsText(group.description),
        tooltip: optional(group.tooltip),
        accessibleLabel: optional(group.accessibleLabel),
        children: group.children.map(translateRow),
    };
}

function translateItem(item: TreeItemModel): TreeItemModel {
    switch (item.kind) {
        case 'group':
            return translateGroup(item);
        case 'action':
            return { ...item, label: jetBrainsText(item.label) };
    }
}

export function translateTree(model: SpecTreeModel): SpecTreeModel {
    return {
        ...model,
        message: optional(model.message),
        description: optional(model.description),
        badge: model.badge === undefined ? undefined : { ...model.badge, tooltip: jetBrainsText(model.badge.tooltip) },
        items: model.items.map(translateItem),
    };
}
