import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, mount, send, shellEvent, type Mounted } from './testing/dom';
import { detailEvent, detailView, sections } from './detail/testing/views';
import { resetSectionMemory } from './detail/sectionMemory';

/** 0016 AC-011: the visible text holds no internal vocabulary. */
const FORBIDDEN = /\bS-[A-Z]+\b|\bR-[1-7]\b|\bNS-\d\b|persisted|Model updated|first observed|no longer observed|not checked|\d{4}-\d{2}-\d{2}T\d{2}:/;

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function visibleText(view = detailView()): Promise<string> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'specExplorer' }), 1));
    await send(detailEvent(view));
    return mounted.container.textContent ?? '';
}

afterEach(() => {
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('0016 AC-011: user language in the detail', () => {
    it('shows no rule ID, "persisted", ISO time or "first observed" in any section', async () => {
        const history = [
            { observedAt: '2026-11-16T09:00:00Z', old: null, new: 'Review', rule: 'S-REVIEW', cause: { kind: 'first-observed' as const, paths: [] }, flow: 'not checked' },
            { observedAt: '2026-11-16T09:05:00Z', old: 'Review', new: null, rule: null, cause: { kind: 'no-longer-observed' as const, paths: [] }, flow: 'not checked' },
        ];
        const base = sections().history;
        const text = await visibleText(detailView({ history: { ...base, statusHistory: history } }));
        expect(text).not.toMatch(FORBIDDEN);
        expect(text).toContain('first seen as Review');
        expect(text).toContain('Review → no longer in the project');
    });

    it('negative control: the old history line is caught by the same pattern', () => {
        expect('2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked').toMatch(FORBIDDEN);
        expect('S-ACTIVE · persisted').toMatch(FORBIDDEN);
    });
});
