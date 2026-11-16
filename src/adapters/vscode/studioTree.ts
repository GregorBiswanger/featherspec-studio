import * as vscode from 'vscode';
import { buildTreeModel, type TreeItemModel, type TreeModel } from '../../core/shell/treeModel';
import type { ShellService } from '../../core/shell/shellService';
import { AREA_COMMANDS, NAVIGATOR_VIEW, OPEN_COMMAND, SHELL_ACTION_COMMAND } from './commands';

export interface StudioTree extends vscode.Disposable {
    model(): TreeModel;
}

function toItem(model: TreeItemModel): vscode.TreeItem {
    const item = new vscode.TreeItem(model.label, vscode.TreeItemCollapsibleState.None);
    switch (model.kind) {
        case 'project':
            item.iconPath = new vscode.ThemeIcon('folder');
            break;
        case 'open':
            item.iconPath = new vscode.ThemeIcon('window');
            item.command = { command: OPEN_COMMAND, title: model.label };
            break;
        case 'area':
            item.iconPath = new vscode.ThemeIcon('symbol-misc');
            item.command = { command: AREA_COMMANDS[model.area], title: model.label };
            break;
        case 'action':
            item.iconPath = new vscode.ThemeIcon('play');
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
    const treeView = vscode.window.createTreeView(NAVIGATOR_VIEW, { treeDataProvider: provider });
    treeView.message = model.message;
    const subscription = service.onDidChangeView(() => {
        model = current();
        treeView.message = model.message;
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
