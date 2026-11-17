import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY_MERGE_PROMPT_COMMAND_ID, SETUP_COMMAND_ID } from '../../shared/protocol/texts';
import { createShellActions } from './shellActions';

const executed: unknown[][] = [];

vi.mock('vscode', () => ({
    commands: {
        executeCommand: (...args: unknown[]) => {
            executed.push(args);
            return Promise.resolve(undefined);
        },
    },
    env: { openExternal: () => Promise.resolve(true) },
    Uri: { parse: (value: string) => ({ toString: () => value }) },
}));

function actions() {
    return createShellActions({ showOutput: () => undefined, reloadPanel: () => undefined });
}

describe('0014 AC-002: the setUp action of the view and the panel runs the setup command', () => {
    beforeEach(() => {
        executed.length = 0;
    });

    it('setUp executes featherspec-studio.setup', async () => {
        await actions().setUp();
        expect(executed).toEqual([[SETUP_COMMAND_ID]]);
        expect(SETUP_COMMAND_ID).toBe('featherspec-studio.setup');
    });

    it('copyMergePrompt executes featherspec-studio.copyMergePrompt', async () => {
        await actions().copyMergePrompt();
        expect(executed).toEqual([[COPY_MERGE_PROMPT_COMMAND_ID]]);
        expect(COPY_MERGE_PROMPT_COMMAND_ID).toBe('featherspec-studio.copyMergePrompt');
    });

    it('negative control: manageTrust runs its own command, not the setup', async () => {
        await actions().manageTrust();
        expect(executed).toEqual([['workbench.trust.manage']]);
    });
});
