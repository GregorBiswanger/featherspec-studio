import { describe, expect, it } from 'vitest';
import type { CommandPort } from '../ports/assistant';
import { openSettings } from './openSettings';

function recorder(): CommandPort & { calls: { command: string; args: readonly unknown[] }[] } {
    const calls: { command: string; args: readonly unknown[] }[] = [];
    return {
        calls,
        async execute(command, args) {
            calls.push({ command, args });
            return undefined;
        },
    };
}

describe('0024 AC-013: Open Settings', () => {
    it('makes exactly the one call workbench.action.openSettings with the extension query', async () => {
        const commands = recorder();
        await openSettings(commands);
        expect(commands.calls).toEqual([{ command: 'workbench.action.openSettings', args: ['@ext:GregorBiswanger.featherspec-studio'] }]);
    });

    it('negative control: the recorder shows a second call or another argument', async () => {
        const commands = recorder();
        await commands.execute('x', ['a']);
        await commands.execute('y', []);
        expect(commands.calls).not.toEqual([{ command: 'workbench.action.openSettings', args: ['@ext:GregorBiswanger.featherspec-studio'] }]);
    });
});
