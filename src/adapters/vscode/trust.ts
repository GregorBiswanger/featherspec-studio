import * as vscode from 'vscode';
import type { TrustPort } from '../../core/ports/shell';

export function createTrust(): TrustPort {
    return {
        isTrusted: () => vscode.workspace.isTrusted,
        onDidGrant: (listener) => vscode.workspace.onDidGrantWorkspaceTrust(() => listener()),
    };
}
