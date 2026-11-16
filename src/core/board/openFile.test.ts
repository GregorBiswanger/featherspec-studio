import { describe, expect, it } from 'vitest';
import type { EditorPort } from '../ports/board';
import { noteText, planText, specText } from '../lifecycle/testing/projects';
import { createOpenFile } from './openFile';
import { createFakeSource, modelOf } from './testing/boardWorld';

const FILES = {
    '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: '[0001-a.plan.md](0001-a.plan.md)' }),
    '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }),
    '.specs/done/0002-b.md': specText({ status: 'Implemented', plan: '[0002-b.2026-11-01.plan.md](../plan-archive/0002-b.2026-11-01.plan.md)' }),
    '.specs/plan-archive/0002-b.2026-11-01.plan.md': planText({ status: 'Done' }),
    '.memory-bank/activeContext.0001-T-002.md': noteText('DONE'),
};

async function setup(outcome: 'opened' | 'not-found' = 'opened') {
    const calls: { root: string; key: string; line?: number }[] = [];
    const editor: EditorPort = {
        async open(root, key, line) {
            calls.push(line === undefined ? { root, key } : { root, key, line });
            return outcome;
        },
    };
    const source = createFakeSource(await modelOf(FILES));
    return { open: createOpenFile({ source, editor }), calls, root: source.current()!.project.root };
}

describe('open file', () => {
    it.each(['.specs/active/0001-a.md', '.specs/active/0001-a.plan.md', '.specs/plan-archive/0002-b.2026-11-01.plan.md', '.memory-bank/activeContext.0001-T-002.md'])(
        'AC-010: opens %s (spec, plan, archived plan or return note of the model)',
        async (key) => {
            const { open, calls, root } = await setup();
            expect(await open.open(key, 12)).toEqual({ kind: 'opened' });
            expect(calls).toEqual([{ root, key, line: 12 }]);
        },
    );

    it('AC-010: without a line the editor gets none (top of the file)', async () => {
        const { open, calls } = await setup();
        await open.open('.specs/active/0001-a.md');
        expect(calls[0]).not.toHaveProperty('line');
    });

    it.each(['.specs/active/0099-unknown.md', '../outside.md', '/etc/passwd', '.specs/../../x.md', 'AGENTS.md', ''])('AC-010: refuses %j and opens nothing', async (key) => {
        const { open, calls } = await setup();
        expect(await open.open(key)).toEqual({ kind: 'refused' });
        expect(calls).toEqual([]);
    });

    it('AC-010: a file that is gone since the snapshot says so and opens nothing', async () => {
        const { open } = await setup('not-found');
        expect(await open.open('.specs/active/0001-a.md')).toEqual({ kind: 'not-found', text: 'File not found: .specs/active/0001-a.md' });
    });
});
