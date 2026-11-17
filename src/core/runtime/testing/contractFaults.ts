import { describe, expect, it } from 'vitest';
import { NEWER_VERSION_REASON, newerVersionNotice } from '../notices';
import type { ContractContext, ContractRig } from './contract';

const STEM = '0011-example';
const PROJECT = 'project-A';
const DAY = 86_400_000;
const HISTORY = 'spec-status-history.jsonl';

async function raw(rig: ContractRig, name: string): Promise<string> {
    return (await rig.harness.readRaw(PROJECT, name)) ?? '';
}

async function append(rig: ContractRig, name: string, text: string): Promise<void> {
    await rig.harness.writeRaw(PROJECT, name, (await raw(rig, name)) + text);
}

async function snapshot(rig: ContractRig): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    for (const name of await rig.harness.listRaw(PROJECT)) {
        files.set(name, await raw(rig, name));
    }
    return files;
}

export function registerFaultsContract(context: ContractContext): void {
    describe('save failures', () => {
        it('AC-014: a failed status history write is refused with the reason; the next write is stored and nothing was half written', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            await store.appendSpecStatusEntry(STEM, { to: 'a' });
            rig.faults.failNext(HISTORY);
            await expect(store.appendSpecStatusEntry(STEM, { to: 'lost' })).rejects.toMatchObject({ code: 'storage-failed' });
            await store.appendSpecStatusEntry(STEM, { to: 'b' });
            const history = await store.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'a' }, { to: 'b' }]);
        });

        it('AC-014: negative control, without a failure every entry is stored and nothing is warned', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            await store.appendSpecStatusEntry(STEM, { to: 'a' });
            await store.appendSpecStatusEntry(STEM, { to: 'b' });
            const history = await store.readSpecStatusHistory();
            expect(history.available && history.value.length).toBe(2);
            expect(rig.notices.messages).toEqual([]);
        });
    });

    describe('a kill during a write (PD-028, AC-021, AC-010)', () => {
        it('AC-021: an incomplete last history record is skipped, the bytes stay unchanged and nothing is reported', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'a' });
            await seed.dispose();
            await append(rig, HISTORY, '{"v":1,"stem":"0011-example","obse');
            const killed = await snapshot(rig);
            rig.notices.messages.length = 0;
            const store = await rig.open();
            const history = await store.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'a' }]);
            expect(await raw(rig, HISTORY)).toBe(killed.get(HISTORY));
            expect(rig.notices.messages).toEqual([]);
        });

        it('AC-021: a spec status entry appended after an incomplete history record stays readable', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'a' });
            await seed.dispose();
            await append(rig, HISTORY, '{"v":1,"stem":"0011-example","obse');
            const killed = await snapshot(rig);
            const first = await rig.open();
            await first.appendSpecStatusEntry(STEM, { to: 'b' });
            await first.dispose();
            const second = await rig.open();
            const history = await second.readSpecStatusHistory();
            expect(history.available && history.value.map((record) => record.entry)).toEqual([{ to: 'a' }, { to: 'b' }]);
            expect((await raw(rig, HISTORY)).startsWith(killed.get(HISTORY) ?? '\u0000')).toBe(true);
        });
    });

    describe('writes to data that is newer (AC-017)', () => {
        it('AC-017: a spec status entry for a history file with a newer record is refused and nothing is appended', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'a' });
            await seed.dispose();
            await append(rig, HISTORY, '{"v":2,"stem":"x","entry":1}\n');
            const before = await raw(rig, HISTORY);
            const store = await rig.open();
            await expect(store.appendSpecStatusEntry(STEM, { to: 'b' })).rejects.toMatchObject({ code: 'newer-version' });
            await store.dispose();
            expect(await raw(rig, HISTORY)).toBe(before);
        });

        it('AC-017: negative control, a history file of the current format accepts an entry', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'a' });
            await seed.dispose();
            const store = await rig.open();
            await expect(store.appendSpecStatusEntry(STEM, { to: 'b' })).resolves.toBeUndefined();
        });
    });

    describe('newer versions', () => {
        it('AC-017: a store written by a newer version is left byte-identical, not shown, not written, one notice', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'a' });
            await seed.dispose();
            await rig.harness.writeRaw(PROJECT, 'store.json', JSON.stringify({ storeVersion: 2, projectRoot: PROJECT }));
            rig.clock.advance(200 * DAY);
            const before = await snapshot(rig);
            rig.notices.messages.length = 0;
            const store = await rig.open();
            expect(store.state()).toEqual({ kind: 'read-only', reason: NEWER_VERSION_REASON });
            expect(await store.readSpecStatusHistory()).toEqual({ available: false, reason: NEWER_VERSION_REASON });
            await expect(store.appendSpecStatusEntry(STEM, { to: 'b' })).rejects.toMatchObject({ code: 'read-only' });
            rig.clock.advance(60_000);
            await rig.settle();
            await store.dispose();
            expect(rig.notices.messages).toEqual([newerVersionNotice()]);
            expect(await snapshot(rig)).toEqual(before);
        });

        it('AC-017: a history record of a newer format is untouched by the age cap', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'readable' });
            await seed.dispose();
            const future = '{"v":2,"stem":"x","entry":1}\n';
            await append(rig, HISTORY, future);
            rig.clock.advance(200 * DAY);
            const store = await rig.open();
            const history = await store.readSpecStatusHistory();
            expect(history).toEqual({ available: true, value: [] });
            expect(await raw(rig, HISTORY)).toBe(future);
        });
    });

    describe('a store description that cannot be read', () => {
        it('AC-025: a broken store description makes the store unavailable and leaves every file unchanged', async () => {
            const rig = await context.newRig();
            const seed = await rig.open();
            await seed.appendSpecStatusEntry(STEM, { to: 'a' });
            await seed.dispose();
            await rig.harness.writeRaw(PROJECT, 'store.json', '{{ not json');
            const before = await snapshot(rig);
            const store = await rig.open();
            expect(store.state().kind).toBe('unavailable');
            await expect(store.appendSpecStatusEntry(STEM, { to: 'b' })).rejects.toMatchObject({ code: 'unavailable' });
            await store.dispose();
            expect(await snapshot(rig)).toEqual(before);
        });
    });
}
