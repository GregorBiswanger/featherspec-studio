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

    it('AC-031 the JetBrains table marks all three terminal rows, and only those wait', () => {
        const table = createJetBrainsAssistants();
        const waits = Object.entries(table).filter(([assistant, row]) => waitsForStart({ assistant: assistant as 'copilot' | 'claudeCode' | 'junie', ...(row.terminal === true ? { terminal: true as const } : {}), target: row.targets[0] ?? 'new', targets: [...row.targets] })).map(([assistant]) => assistant);
        expect(waits).toEqual(['junie', 'claudeCode', 'copilot']);
    });
});
