import { describe, expect, it } from 'vitest';
import { SECRET_PATTERNS } from '../masking';
import { sampleOf } from './secretSamples';
import type { ContractContext } from './contract';

const SPEC = { stem: '0009-provider', path: '.specs/active/0009-provider.md' };
const CREDENTIAL = 'fake-provider-credential-4711';

export function registerMaskingContract(context: ContractContext): void {
    describe('masking', () => {
        it('AC-013: samples of every pattern and the provider credential never reach the port or the written bytes', async () => {
            const rig = await context.newRig();
            rig.credentials.held.push(CREDENTIAL);
            const store = await rig.open();
            const samples = SECRET_PATTERNS.map((pattern) => sampleOf(pattern.name));
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(run.runId, {
                type: 'message',
                payload: { text: `token ${samples.join(' and ')} plus ${CREDENTIAL}`, nested: [`again ${samples[0]}`, { key: CREDENTIAL }] },
            });
            await store.reportStatus(run.runId, 'Failed', {
                cause: `cause ${samples[1]}`,
                errorClass: 'ProviderError',
                errorMessage: `failed with ${CREDENTIAL}`,
                result: { output: `out ${samples[2]}` },
            });
            await new Promise<void>((resolve) => setTimeout(resolve, 20));
            const returned = JSON.stringify([
                await store.getRun(run.runId),
                await store.listRuns(),
                await store.readEvents(run.runId, 1, 10),
            ]);
            const raw = await rig.rawBytes();
            for (const secret of [...samples, CREDENTIAL]) {
                expect(returned).not.toContain(secret);
                expect(raw).not.toContain(secret);
            }
            expect(raw).toContain('[masked]');
            const page = await store.readEvents(run.runId, 1, 10);
            expect(page.available && JSON.stringify(page.value[0]?.payload)).toContain('token [masked]');
        });

        it('AC-013: negative control, text without secrets is stored as it is', async () => {
            const rig = await context.newRig();
            rig.credentials.held.push(CREDENTIAL);
            const store = await rig.open();
            const run = await store.createRun({ providerId: 'fake', spec: SPEC });
            await store.appendEvent(run.runId, { type: 'message', payload: 'plain progress text' });
            const done = await store.reportStatus(run.runId, 'Completed', { cause: 'finished', result: 'all good' });
            const page = await store.readEvents(run.runId, 1, 10);
            expect(page.available && page.value[0]?.payload).toBe('plain progress text');
            expect(done.statusHistory[1]?.cause).toBe('finished');
            expect(done.result).toBe('all good');
        });
    });

    describe('spec status history', () => {
        it('AC-026: entries come back under their stem and for the whole project in append order, also after a restart', async () => {
            const rig = await context.newRig();
            const first = await rig.open();
            await first.appendSpecStatusEntry('0007-board', { from: 'Draft', to: 'Ready' });
            await first.appendSpecStatusEntry('0008-start', { from: 'Draft', to: 'Draft' });
            await first.appendSpecStatusEntry('0007-board', { from: 'Ready', to: 'In Progress', note: 'unchanged text' });
            await first.dispose();
            const second = await rig.open();
            const all = await second.readSpecStatusHistory();
            expect(all.available && all.value.map((record) => [record.stem, record.entry])).toEqual([
                ['0007-board', { from: 'Draft', to: 'Ready' }],
                ['0008-start', { from: 'Draft', to: 'Draft' }],
                ['0007-board', { from: 'Ready', to: 'In Progress', note: 'unchanged text' }],
            ]);
            const one = await second.readSpecStatusHistory('0007-board');
            expect(one.available && one.value.length).toBe(2);
            expect(await second.readSpecStatusHistory('0099-none')).toEqual({ available: true, value: [] });
        });

        it('AC-026, BR-010: entries are not masked or interpreted', async () => {
            const rig = await context.newRig();
            const store = await rig.open();
            const text = 'looks like sk-0123456789abcdefghijklmnop but is spec text';
            await store.appendSpecStatusEntry('0007-board', { text });
            const read = await store.readSpecStatusHistory('0007-board');
            expect(read.available && read.value[0]?.entry).toEqual({ text });
        });
    });
}
