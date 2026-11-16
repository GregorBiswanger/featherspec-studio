import * as vscode from 'vscode';
import type { SourceEntryKind, SpecSourcePort } from '../../core/ports/specSource';

const ABSENT_CODES = new Set(['FileNotFound', 'FileNotADirectory']);

function target(root: string, relativePath: string): vscode.Uri {
    return vscode.Uri.joinPath(vscode.Uri.parse(root), ...relativePath.split('/').filter((part) => part.length > 0));
}

function isAbsent(error: unknown): boolean {
    return error instanceof vscode.FileSystemError && ABSENT_CODES.has(error.code);
}

function kindOf(type: vscode.FileType): SourceEntryKind {
    if (type & vscode.FileType.SymbolicLink) {
        return 'symlink';
    }
    if (type & vscode.FileType.File) {
        return 'file';
    }
    return type & vscode.FileType.Directory ? 'directory' : 'other';
}

export function createVscodeSpecSource(): SpecSourcePort {
    return {
        async list(root, relativePath) {
            try {
                const entries = await vscode.workspace.fs.readDirectory(target(root, relativePath));
                return entries.map(([name, type]) => ({ name, kind: kindOf(type) }));
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
        async stat(root, relativePath) {
            try {
                const stats = await vscode.workspace.fs.stat(target(root, relativePath));
                return { kind: kindOf(stats.type), mtimeMs: stats.mtime, size: stats.size };
            } catch (error) {
                if (isAbsent(error)) {
                    return undefined;
                }
                throw error;
            }
        },
        readBytes(root, relativePath) {
            return Promise.resolve(vscode.workspace.fs.readFile(target(root, relativePath)));
        },
    };
}
