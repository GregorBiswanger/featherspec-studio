import { describe, expect, it } from 'vitest';
import { resolveStorageLocation } from './storageLocation';

describe('resolveStorageLocation', () => {
    it('uses the file system path of a file URI', () => {
        expect(resolveStorageLocation({ scheme: 'file', fsPath: 'c:\\Users\\g\\globalStorage\\x' }, undefined)).toEqual({
            kind: 'directory',
            path: 'c:\\Users\\g\\globalStorage\\x',
        });
    });

    it('falls back to the absolute legacy path when a local host reports a non-file scheme', () => {
        expect(resolveStorageLocation({ scheme: 'vscode-userdata', fsPath: '/c:/Users/g/globalStorage/x' }, 'c:\\Users\\g\\globalStorage\\x')).toEqual({
            kind: 'directory',
            path: 'c:\\Users\\g\\globalStorage\\x',
        });
        expect(resolveStorageLocation({ scheme: 'vscode-userdata', fsPath: '/x' }, '/home/g/.config/Code/globalStorage/x')).toEqual({
            kind: 'directory',
            path: '/home/g/.config/Code/globalStorage/x',
        });
    });

    it('is unavailable, and names the scheme, when no local path exists', () => {
        expect(resolveStorageLocation({ scheme: 'vscode-userdata', fsPath: '/x' }, undefined)).toEqual({
            kind: 'unavailable',
            reason: 'storage location is not on the local file system (scheme "vscode-userdata")',
        });
        expect(resolveStorageLocation({ scheme: 'vscode-userdata', fsPath: '/x' }, '')).toMatchObject({ kind: 'unavailable' });
        expect(resolveStorageLocation({ scheme: 'vscode-vfs', fsPath: '/x' }, 'relative/dir')).toMatchObject({ kind: 'unavailable' });
    });
});
