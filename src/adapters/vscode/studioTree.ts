import * as vscode from 'vscode';
import type { SpecTreeService } from '../../core/shell/specTreeService';
import type { SpecRowModel, SpecTreeModel, TreeItemModel } from '../../core/shell/specTree';
import { TREE_COMMAND_TITLES } from '../../shared/protocol/texts';
import { NAVIGATOR_VIEW, SELECT_SPEC_COMMAND, SHELL_ACTION_COMMAND } from './commands';

const PANEL_STATE_CONTEXT = 'featherspec-studio.panelState';

export interface StudioTree extends vscode.Disposable {
    model(): SpecTreeModel;
}

type Element = TreeItemModel | SpecRowModel;

function toItem(model: Element): vscode.TreeItem {
    switch (model.kind) {
        case 'group': {
            const item = new vscode.TreeItem(model.label, model.collapsed ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded);
            item.id = model.id;
            item.description = model.description;
            return item;
        }
        case 'spec': {
            const item = new vscode.TreeItem(model.label, vscode.TreeItemCollapsibleState.None);
            item.id = model.id;
            item.description = model.description;
            item.iconPath = new vscode.ThemeIcon(model.icon, new vscode.ThemeColor(model.color));
            const tooltip = new vscode.MarkdownString(model.tooltip);
            tooltip.isTrusted = false;
            tooltip.supportThemeIcons = false;
            tooltip.supportHtml = false;
            item.tooltip = tooltip;
            item.accessibilityInformation = { label: model.accessibleLabel };
            item.contextValue = model.contextValue;
            item.command = {
                command: SELECT_SPEC_COMMAND,
                title: TREE_COMMAND_TITLES.select,
                arguments: [model.path === undefined ? { stem: model.stem } : { stem: model.stem, path: model.path }],
            };
            return item;
        }
        case 'action': {
            const item = new vscode.TreeItem(model.label, vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon(model.icon);
            item.command = { command: SHELL_ACTION_COMMAND, title: model.label, arguments: [model.action] };
            return item;
        }
    }
}

export function createStudioTree(service: SpecTreeService): StudioTree {
    const changed = new vscode.EventEmitter<void>();
    const provider: vscode.TreeDataProvider<Element> = {
        onDidChangeTreeData: changed.event,
        getTreeItem: toItem,
        getChildren: (element) => (element === undefined ? service.model().items : element.kind === 'group' ? element.children : []),
    };
    const treeView = vscode.window.createTreeView(NAVIGATOR_VIEW, { treeDataProvider: provider });
    const publish = (model: SpecTreeModel) => {
        treeView.message = model.message;
        treeView.badge = model.badge;
        treeView.description = model.description;
        void vscode.commands.executeCommand('setContext', PANEL_STATE_CONTEXT, model.welcome ?? '');
    };
    publish(service.model());
    const subscription = service.onDidChange((model) => {
        publish(model);
        changed.fire();
    });
    return {
        model: () => service.model(),
        dispose() {
            subscription.dispose();
            treeView.dispose();
            changed.dispose();
        },
    };
}
