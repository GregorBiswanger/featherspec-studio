import * as vscode from 'vscode';
import { buildTreeModel, type TreeItemModel, type TreeModel } from '../../core/shell/treeModel';
import type { ShellService } from '../../core/shell/shellService';
import { AREA_COMMANDS, NAVIGATOR_VIEW, OPEN_COMMAND, SHELL_ACTION_COMMAND } from './commands';

const PANEL_STATE_CONTEXT = 'featherspec-studio.panelState';

export interface StudioTree extends vscode.Disposable {
    model(): TreeModel;
}

function toItem(model: TreeItemModel): vscode.TreeItem {
    const item = new vscode.TreeItem(model.label, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(model.icon);
    switch (model.kind) {
        case 'project':
            break;
        case 'open':
            item.command = { command: OPEN_COMMAND, title: model.label };
            break;
        case 'area':
            item.command = { command: AREA_COMMANDS[model.area], title: model.label };
            break;
        case 'action':
            item.command = { command: SHELL_ACTION_COMMAND, title: model.label, arguments: [model.action] };
            break;
    }
    return item;
}

export function createStudioTree(service: ShellService): StudioTree {
    const changed = new vscode.EventEmitter<void>();
    const current = (): TreeModel => {
        const view = service.view();
        return buildTreeModel({ projectActive: view.projectName !== undefined, projectName: view.projectName, state: view.state });
    };
    let model = current();
    const provider: vscode.TreeDataProvider<TreeItemModel> = {
        onDidChangeTreeData: changed.event,
        getTreeItem: toItem,
        getChildren: (element) => (element === undefined ? model.items : []),
    };
    const publish = () => {
        treeView.message = model.message;
        void vscode.commands.executeCommand('setContext', PANEL_STATE_CONTEXT, model.welcome ?? '');
    };
    const treeView = vscode.window.createTreeView(NAVIGATOR_VIEW, { treeDataProvider: provider });
    publish();
    const subscription = service.onDidChangeView(() => {
        model = current();
        publish();
        changed.fire();
    });
    return {
        model: () => model,
        dispose() {
            subscription.dispose();
            treeView.dispose();
            changed.dispose();
        },
    };
}
