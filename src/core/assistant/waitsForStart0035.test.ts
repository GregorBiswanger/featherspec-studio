import { describe, expect, it } from 'vitest';
import { waitsForStart } from '../../shared/protocol/assistant';
import { ASSISTANTS } from './assistants';
import { createJetBrainsAssistants } from '../../hosts/embedded/assistants';

describe('0035 amendment 2026-11-23 / AC-031: only the JetBrains terminal handover waits for its start', () => {
    it('AC-031 the VS Code table never offers the target current for Claude Code, so VS Code never waits', () => {
        expect(ASSISTANTS.claudeCode.targets).toEqual(['new']);
        for (const [assistant, row] of Object.entries(ASSISTANTS)) {
            expect(waitsForStart({ assistant: assistant as 'copilot' | 'claudeCode', target: 'new', targets: [...row.targets] }), assistant).toBe(false);
        }
    });

    it('AC-031 the JetBrains table offers it for Claude Code alone', () => {
        const table = createJetBrainsAssistants(() => []);
        const waits = Object.entries(table).filter(([assistant, row]) => waitsForStart({ assistant: assistant as 'copilot' | 'claudeCode' | 'junie', ...(row.handover === 'copyFor' ? { handover: 'copyFor' as const } : {}), target: row.targets[0] ?? 'new', targets: [...row.targets] })).map(([assistant]) => assistant);
        expect(waits).toEqual(['claudeCode']);
    });
});
