import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from './deriveLifecycle';
import { readFixture, readMemory, specText } from './testing/projects';
import { successorText } from './successor';

const ARCHIVE = '[0001-a.2026-11-01.plan.md](../plan-archive/0001-a.2026-11-01.plan.md)';

async function successorOf(extraHeader: string | undefined, body = ''): Promise<ReturnType<typeof successorText>> {
    const text = specText({ status: 'Deprecated', plan: ARCHIVE, extraHeader }) + body;
    const model = deriveLifecycle(await readMemory({ '.specs/done/0001-a.md': text }));
    const marker = model.entries[0].deprecated;
    if (marker === undefined) {
        throw new Error('no Deprecated marker');
    }
    return successorText(marker.successor);
}

describe('Deprecated marker and successor', () => {
    it('AC-013: a Deprecated done/ spec with a Successor link is Done with the Deprecated marker and the link', async () => {
        const model = deriveLifecycle(await readFixture('fs110-ready-synthetic'));
        const entry = model.entries.find((candidate) => candidate.stem === '0002-old-feature');
        expect(entry?.state).toBe('Done');
        expect(entry?.deprecated).toEqual({ successor: { kind: 'link', target: '../backlog/0001-ready-feature.md', text: '0001-ready-feature.md' } });
    });

    it('AC-013: the text "successor: none — behaviour removed" gives the removed outcome, in the header or in the body', async () => {
        expect(await successorOf('**Successor:** none — behaviour removed')).toBe('successor: none — behaviour removed');
        expect(await successorOf(undefined, '\n## Notes\n\nsuccessor: none — behaviour removed\n')).toBe('successor: none — behaviour removed');
        expect(await successorOf(undefined, '\n## Notes\n\nSuccessor: none — behaviour removed\n')).toBe('successor: none — behaviour removed');
    });

    it('AC-013: a body line "successor: [link](path)" gives the link', async () => {
        const model = deriveLifecycle(
            await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Deprecated', plan: ARCHIVE }) + '\nsuccessor: [0009-b.md](../active/0009-b.md)\n' }),
        );
        expect(model.entries[0].deprecated?.successor).toEqual({ kind: 'link', target: '../active/0009-b.md', text: '0009-b.md' });
    });

    it('AC-013: neither a link nor the removed text gives "successor: not available"', async () => {
        expect(await successorOf(undefined)).toBe('successor: not available');
        expect(await successorOf('**Successor:** soon, maybe')).toBe('successor: not available');
        expect(await successorOf(undefined, '\nsuccessor: later\n')).toBe('successor: not available');
    });

    it('AC-013: the header line wins over a body line', async () => {
        expect(await successorOf('**Successor:** none — behaviour removed', '\nsuccessor: later\n')).toBe('successor: none — behaviour removed');
    });

    it('AC-013: a spec that is not Deprecated carries no marker (negative control)', async () => {
        const model = deriveLifecycle(await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE, extraHeader: '**Successor:** none — behaviour removed' }) }));
        expect(model.entries[0].deprecated).toBeUndefined();
    });
});
