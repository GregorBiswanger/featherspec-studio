import { describe, expect, it } from 'vitest';
import { globalOnlyString, trimmedString } from './copilotSettingValues';

describe('setting values (AC-002, AC-008)', () => {
    it('AC-002: the CLI path comes from the user (global) value only, never from a workspace or folder value', () => {
        expect(globalOnlyString({ globalValue: ' C:\\tools\\copilot.exe ', workspaceValue: 'C:\\evil.exe', workspaceFolderValue: 'C:\\worse.exe' })).toBe('C:\\tools\\copilot.exe');
        expect(globalOnlyString({ workspaceValue: 'C:\\evil.exe', workspaceFolderValue: 'C:\\worse.exe' })).toBe('');
        expect(globalOnlyString(undefined)).toBe('');
        expect(globalOnlyString({ globalValue: 42 })).toBe('');
    });

    it('AC-008: the model value is the trimmed string, empty for anything else', () => {
        expect(trimmedString('  gpt-x ')).toBe('gpt-x');
        expect(trimmedString('')).toBe('');
        expect(trimmedString(undefined)).toBe('');
        expect(trimmedString(7)).toBe('');
    });
});
