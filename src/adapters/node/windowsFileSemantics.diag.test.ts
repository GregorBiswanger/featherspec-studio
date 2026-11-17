import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RuntimeMedium } from '../../core/ports/runtimeMedium';
import { openRuntimeStore } from '../../core/runtime/runtimeStore';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../../core/runtime/testing/fakes';
import { createFileRuntimeMedium } from './fileRuntimeMedium';

function codeOf(error: unknown): string {
    return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : String(error);
}

async function outcome(action: () => Promise<unknown>): Promise<string> {
    const started = performance.now();
    try {
        const value = await action();
        return `ok${value === undefined ? '' : `:${JSON.stringify(value)}`} ${Math.round(performance.now() - started)}ms`;
    } catch (error) {
        return `${codeOf(error)} ${Math.round(performance.now() - started)}ms`;
    }
}

function report(title: string, value: unknown): void {
    console.log(`[fs-diag] ${title} ${JSON.stringify(value)}`);
}

function timedMedium(inner: RuntimeMedium, log: string[]): RuntimeMedium {
    async function timed<T>(label: string, action: () => Promise<T>): Promise<T> {
        const started = performance.now();
        try {
            const value = await action();
            log.push(`${label} ${Math.round(performance.now() - started)}ms`);
            return value;
        } catch (error) {
            log.push(`${label} ${codeOf(error)} ${Math.round(performance.now() - started)}ms`);
            throw error;
        }
    }
    return {
        open: () => timed('open', () => inner.open()),
        read: (name) => timed(`read ${name}`, () => inner.read(name)),
        lines: (name) => inner.lines(name),
        append: (name, text) => timed(`append ${name}`, () => inner.append(name, text)),
        replace: (name, text) => timed(`replace ${name}`, () => inner.replace(name, text)),
        createExclusive: (name, text) => timed(`createExclusive ${name}`, () => inner.createExclusive(name, text)),
        remove: (name) => timed(`remove ${name}`, () => inner.remove(name)),
        list: (directory) => timed(`list ${directory}`, () => inner.list(directory)),
    };
}

describe.runIf(process.platform === 'win32' || process.env['FS_DIAG'] === '1')('file semantics diagnostic (prints what this platform does)', () => {
    it('raw file-system behaviour around an open handle', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-diag-'));
        const target = path.join(root, 'lock.json');
        const temporary = path.join(root, 'lock.json.tmp');
        await fs.writeFile(target, 'one');
        await fs.writeFile(temporary, 'two');
        const reader = await fs.open(target, 'r');
        const results: Record<string, string> = {};
        results['renameOverOpenFile'] = await outcome(() => fs.rename(temporary, target));
        await reader.close();
        results['renameAfterClose'] = await outcome(async () => {
            await fs.writeFile(temporary, 'three');
            await fs.rename(temporary, target);
        });
        const holder = await fs.open(target, 'r');
        results['unlinkOpenFile'] = await outcome(() => fs.unlink(target));
        results['readdirWhileDeletePending'] = await outcome(() => fs.readdir(root));
        results['readFileWhileDeletePending'] = await outcome(() => fs.readFile(target, 'utf8'));
        results['createWxWhileDeletePending'] = await outcome(() => fs.writeFile(target, 'four', { flag: 'wx' }));
        await holder.close();
        results['createWxAfterClose'] = await outcome(() => fs.writeFile(target, 'five', { flag: 'wx' }));
        const appendHolder = await fs.open(target, 'r');
        results['appendWhileOtherHandleOpen'] = await outcome(() => fs.appendFile(target, 'six'));
        await appendHolder.close();
        const stat = await fs.stat(target);
        results['mtimeMs'] = String(stat.mtimeMs);
        results['node'] = process.version;
        report('raw', results);
        await fs.rm(root, { recursive: true, force: true });
        expect(Object.keys(results).length).toBeGreaterThan(5);
    });

    it('the product medium around an open handle', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-diag-medium-'));
        const medium = createFileRuntimeMedium(root);
        await medium.open();
        const results: Record<string, string> = {};
        results['createExclusive'] = await outcome(() => medium.createExclusive('lock.json', 'a'));
        const reader = await fs.open(path.join(root, 'lock.json'), 'r');
        results['replaceWhileOpen'] = await outcome(() => medium.replace('lock.json', 'b'));
        results['removeWhileOpen'] = await outcome(() => medium.remove('lock.json'));
        results['readWhileDeletePending'] = await outcome(() => medium.read('lock.json'));
        results['createExclusiveWhileDeletePending'] = await outcome(() => medium.createExclusive('lock.json', 'c'));
        await reader.close();
        results['createExclusiveAfterClose'] = await outcome(() => medium.createExclusive('lock.json', 'd'));
        results['readAfter'] = await outcome(() => medium.read('lock.json'));
        report('medium', results);
        await fs.rm(root, { recursive: true, force: true });
        expect(Object.keys(results).length).toBe(7);
    });

    it('append throughput: one write per event against one write for many', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-diag-append-'));
        const line = `${JSON.stringify({ v: 1, seq: 1, type: 'message', payload: 'x'.repeat(200) })}\n`;
        const count = 1000;
        let started = performance.now();
        for (let index = 0; index < count; index += 1) {
            await fs.appendFile(path.join(root, 'single.jsonl'), line, 'utf8');
        }
        const singleMs = performance.now() - started;
        started = performance.now();
        await fs.appendFile(path.join(root, 'batch.jsonl'), line.repeat(count), 'utf8');
        const batchMs = performance.now() - started;
        const storeRoot = path.join(root, 'store');
        const store = await openRuntimeStore({
            medium: createFileRuntimeMedium(storeRoot),
            ids: createSequentialIds(),
            clock: createFakeRuntimeClock(),
            notices: createFakeNotices(),
            credentials: createFakeCredentials(),
            projectRoot: 'p',
            maxAgeDays: () => undefined,
        });
        const run = await store.createRun({ providerId: 'fake', spec: { stem: 's', path: 'p' } });
        started = performance.now();
        for (let index = 1; index <= 10_000; index += 1) {
            await store.appendEvent(run.runId, { type: 'message', payload: index });
        }
        const loopMs = performance.now() - started;
        await store.dispose();
        const drainMs = performance.now() - started - loopMs;
        report('append', {
            singleWritesPerSecond: Math.round(count / (singleMs / 1000)),
            singleMsPerWrite: Number((singleMs / count).toFixed(2)),
            batchOf1000Ms: Math.round(batchMs),
            store10000LoopMs: Math.round(loopMs),
            store10000DrainMs: Math.round(drainMs),
        });
        await fs.rm(root, { recursive: true, force: true });
        expect(singleMs).toBeGreaterThan(0);
    });

    it('the stale-lock takeover through the real medium, with the time of every operation', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-diag-lock-'));
        const clock = createFakeRuntimeClock();
        const log: string[] = [];
        const open = (traced: boolean) =>
            openRuntimeStore({
                medium: traced ? timedMedium(createFileRuntimeMedium(root), log) : createFileRuntimeMedium(root),
                ids: createSequentialIds(traced ? 'reader' : 'seed'),
                clock,
                notices: createFakeNotices(),
                credentials: createFakeCredentials(),
                projectRoot: 'p',
                maxAgeDays: () => undefined,
            });
        const seed = await open(false);
        const run = await seed.createRun({ providerId: 'fake', spec: { stem: 's', path: 'p' } });
        await seed.reportStatus(run.runId, 'Running');
        await seed.dispose();
        await fs.writeFile(path.join(root, 'lock.json'), JSON.stringify({ owner: 'dead-window', heartbeatAt: clock.epochMs() }), 'utf8');
        const reader = await open(true);
        const atOpen = reader.state().kind;
        log.push('--- advance 50 s');
        clock.advance(50_000);
        let started = performance.now();
        while (log[log.length - 1]?.startsWith('read lock.json') !== true && performance.now() - started < 5000) {
            await new Promise<void>((resolve) => setTimeout(resolve, 2));
        }
        const firstTickMs = Math.round(performance.now() - started);
        log.push('--- advance 20 s');
        clock.advance(20_000);
        started = performance.now();
        while (reader.state().kind !== 'writable' && performance.now() - started < 5000) {
            await new Promise<void>((resolve) => setTimeout(resolve, 2));
        }
        const takeoverMs = Math.round(performance.now() - started);
        report('takeover', { atOpen, firstTickMs, takeoverMs, final: reader.state().kind, operations: log });
        await reader.dispose();
        await fs.rm(root, { recursive: true, force: true });
        expect(atOpen).toBe('read-only');
    });
});
