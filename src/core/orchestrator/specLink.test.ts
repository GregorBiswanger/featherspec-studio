import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readMemory, specText } from '../lifecycle/testing/projects';
import type { ShellModel } from '../ports/shell';
import { isSpecNotFound } from './specLink';

async function modelOf(files: Record<string, string>): Promise<ShellModel> {
    const project = await readMemory(files);
    return { project, lifecycle: deriveLifecycle(project) };
}

describe('spec not found flag', () => {
    it('AC-019: no entry carries the stem: flagged; once an entry carries it again: not flagged', async () => {
        const without = await modelOf({ '.specs/active/0008-start.md': specText({ status: 'In Progress' }) });
        expect(isSpecNotFound('0007-board', without)).toBe(true);
        const withIt = await modelOf({
            '.specs/active/0008-start.md': specText({ status: 'In Progress' }),
            '.specs/active/0007-board.md': specText({ status: 'In Progress' }),
        });
        expect(isSpecNotFound('0007-board', withIt)).toBe(false);
    });

    it('AC-019: a move between lifecycle folders keeps the stem and raises no flag', async () => {
        for (const folder of ['backlog', 'active', 'done']) {
            const model = await modelOf({ [`.specs/${folder}/0007-board.md`]: specText({ status: folder === 'done' ? 'Implemented' : 'Draft' }) });
            expect(isSpecNotFound('0007-board', model), folder).toBe(false);
        }
    });

    it('AC-019: a changed stem is a different stem, so the old one is flagged', async () => {
        const renamed = await modelOf({ '.specs/active/0007-board-renamed.md': specText({ status: 'In Progress' }) });
        expect(isSpecNotFound('0007-board', renamed)).toBe(true);
        expect(isSpecNotFound('0007-board-renamed', renamed)).toBe(false);
    });

    it('AC-019: with no project model nothing can be said, so nothing is flagged', () => {
        expect(isSpecNotFound('0007-board', undefined)).toBe(false);
    });
});
