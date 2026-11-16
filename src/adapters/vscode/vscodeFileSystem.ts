import * as vscode from 'vscode';
import type { EntryKind, ReadOnlyFileSystem } from '../../core/ports/readOnlyFileSystem';

const ABSENT_CODES = new Set(['FileNotFound', 'FileNotADirectory']);

function target(root: string, relativePath: string): vscode.Uri {
    return vscode.Uri.joinPath(vscode.Uri.parse(root), ...relativePath.split('/').filter((part) => part.length > 0));
}

function isAbsent(error: unknown): boolean {
    return error instanceof vscode.FileSystemError && ABSENT_CODES.has(error.code);
}

export function createVscodeFileSystem(): ReadOnlyFileSystem {
    return {
        async stat(root, relativePath): Promise<EntryKind | undefined> {
            try {
                const { type } = await vscode.workspace.fs.stat(target(root, relativePath));
                if (type & vscode.FileType.File) {
                    return 'file';
                }
                return type & vscode.FileType.Directory ? 'directory' : 'other';
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
        async readText(root, relativePath) {
            return new TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(target(root, relativePath)));
        },
        async readDirectory(root, relativePath) {
            try {
                const entries = await vscode.workspace.fs.readDirectory(target(root, relativePath));
                return entries.map(([name]) => name);
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
    };
}
