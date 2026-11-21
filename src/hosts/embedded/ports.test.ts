import { describe, expect, it } from 'vitest';
import { createBridge } from './bridge';
import type { CoreConfig, NativeHost } from './contract';
import { createEmbeddedPorts, type EmbeddedPorts } from './ports';
import { createMirrors, type Mirrors } from './mirrors';

const ACTIVE_PROJECT_KEY = 'featherspec-studio.activeProject';

function config(overrides: Partial<CoreConfig> = {}): CoreConfig {
    return {
        host: 'jetbrains',
        platform: 'linux',
        studioVersion: '1.12.0',
        settings: { 'featherspec-studio.showStepTips': false },
        trusted: true,
        folders: [{ root: 'file:///work/a', name: 'a', displayPath: '/work/a' }],
        memory: { [ACTIVE_PROJECT_KEY]: '"file:///work/a"' },
        ...overrides,
    };
}

function setup(overrides: Partial<CoreConfig> = {}): { ports: EmbeddedPorts; mirrors: Mirrors; frames: Record<string, unknown>[]; respond(index: number, json: string): void; calls(): Record<string, unknown>[] } {
    const frames: Record<string, unknown>[] = [];
    const native: NativeHost = {
        send(frame) {
            const parsed = JSON.parse(frame) as Record<string, unknown>;
            if (parsed.k === 'calls') {
                for (const call of parsed.calls as Record<string, unknown>[]) {
                    frames.push({ k: 'call', ...call });
                }
                return;
            }
            frames.push(parsed);
        },
    };
    const cfg = config(overrides);
    const bridge = createBridge(native);
    const mirrors = createMirrors(cfg);
    const ports = createEmbeddedPorts(bridge, mirrors, cfg);
    return {
        ports,
        mirrors,
        frames,
        respond(index, json) {
            bridge.resolve(frames[index].id as string, json);
        },
        calls() {
            return frames.filter((frame) => frame.k === 'call');
        },
    };
}

function lastCallIndex(frames: Record<string, unknown>[]): number {
    return frames.map((frame, index) => (frame.k === 'call' ? index : -1)).filter((index) => index >= 0).pop() ?? -1;
}

function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('embedded ports (R-3, AC-006: sync ports answer from copies, no frame)', () => {
    it('serves settings, trust, folders, workspace state and memory from copies without sending a frame', () => {
        const { ports, frames } = setup();
        expect(ports.setting('featherspec-studio.showStepTips').read()).toBe(false);
        expect(ports.trust().isTrusted()).toBe(true);
        expect(ports.folders.list()).toEqual([{ root: 'file:///work/a', name: 'a', displayPath: '/work/a' }]);
        expect(ports.workspaceState.get()).toBe('file:///work/a');
        expect(ports.uiMemory('featherspec-studio.board').get()).toBeUndefined();
        expect(ports.earlierRunData.state.has(ACTIVE_PROJECT_KEY)).toBe(true);
        expect(ports.assistantHost.extension('anything')).toBeUndefined();
        expect(frames).toEqual([]);
    });

    it('fires a setting listener only for its own key, after the copy is replaced', () => {
        const { ports, mirrors } = setup();
        const seen: string[] = [];
        ports.setting('featherspec-studio.showStepTips').onDidChange(() => seen.push(`tips=${String(ports.setting('featherspec-studio.showStepTips').read())}`));
        ports.setting('featherspec-studio.other').onDidChange(() => seen.push('other'));
        mirrors.apply('settingsChanged', { key: 'featherspec-studio.showStepTips', value: true });
        expect(seen).toEqual(['tips=true']);
    });

    it('updates the memory copy before the memory.set frame goes out, and sends null for a removal', async () => {
        const { ports, calls } = setup();
        ports.uiMemory('featherspec-studio.board').set({ filter: 'open' });
        expect(ports.uiMemory('featherspec-studio.board').get()).toEqual({ filter: 'open' });
        await flush();
        expect(calls()).toEqual([{ k: 'call', id: expect.any(String), name: 'memory.set', args: { key: 'featherspec-studio.board', value: '{"filter":"open"}' } }]);
        ports.uiMemory('featherspec-studio.board').set(undefined);
        await flush();
        expect(calls()[1].args).toEqual({ key: 'featherspec-studio.board', value: null });
        expect(ports.uiMemory('featherspec-studio.board').get()).toBeUndefined();
    });

    it('writes the active project through memory and reads it back from the copy', async () => {
        const { ports, calls, respond } = setup();
        const pending = ports.workspaceState.set('file:///work/b');
        expect(ports.workspaceState.get()).toBe('file:///work/b');
        await flush();
        expect(calls()[0].args).toEqual({ key: ACTIVE_PROJECT_KEY, value: '"file:///work/b"' });
        respond(0, '{"ok":null}');
        await pending;
    });

    it('answers earlierRunData.state.remove by writing null to memory', async () => {
        const { ports, calls } = setup();
        void ports.earlierRunData.state.remove('featherspec-studio.legacy');
        await flush();
        expect(calls()[0].args).toEqual({ key: 'featherspec-studio.legacy', value: null });
    });

    it('sends fs.stat with root and relative path and maps a null result to undefined', async () => {
        const { ports, calls, respond } = setup();
        const pending = ports.fileSystem.stat('file:///work/a', '.specs');
        await flush();
        expect(calls()[0]).toEqual({ k: 'call', id: expect.any(String), name: 'fs.stat', args: { root: 'file:///work/a', relativePath: '.specs' } });
        respond(0, '{"ok":null}');
        await expect(pending).resolves.toBeUndefined();
    });

    it('decodes source.readBytes from base64 into bytes', async () => {
        const { ports, respond } = setup();
        const pending = ports.specSource.readBytes('file:///work/a', 'a.md');
        await flush();
        respond(0, '{"ok":"aGk="}');
        expect(Array.from(await pending)).toEqual([104, 105]);
    });

    it('sends clipboard.write and editor.open with their arguments and resolves the host answer', async () => {
        const { ports, calls, respond } = setup();
        const copied = ports.clipboard.writeText('next step');
        await flush();
        expect(calls()[0].name).toBe('clipboard.write');
        expect(calls()[0].args).toEqual({ text: 'next step' });
        respond(0, '{"ok":null}');
        await copied;
        const opened = ports.editor.open('file:///work/a', '0001', 3, 'beside');
        await flush();
        expect(calls()[1]).toMatchObject({ name: 'editor.open', args: { root: 'file:///work/a', key: '0001', line: 3, place: 'beside' } });
        respond(1, '{"ok":"opened"}');
        await expect(opened).resolves.toBe('opened');
    });

    it('sends ui.pick with the items and returns the item at the index the host chose', async () => {
        const { ports, calls, respond } = setup();
        const items = [{ label: 'a', description: '', detail: '', root: 'file:///work/a' }, { label: 'b', description: '', detail: '', root: 'file:///work/b' }];
        const picked = ports.ui.showQuickPick(items);
        await flush();
        expect(calls()[0].name).toBe('ui.pick');
        respond(0, '{"ok":1}');
        await expect(picked).resolves.toEqual(items[1]);
    });

    it('maps a null pick to undefined and a notification to its chosen action', async () => {
        const { ports, calls, respond } = setup();
        const none = ports.setupUi.pickTarget([], 'Choose');
        await flush();
        respond(0, '{"ok":null}');
        await expect(none).resolves.toBeUndefined();
        const notified = ports.ui.showNotification({ message: 'Done', actions: ['Refresh'] });
        await flush();
        expect(calls()[1]).toMatchObject({ name: 'ui.notify', args: { message: 'Done', actions: ['Refresh'] } });
        respond(1, '{"ok":"Refresh"}');
        await expect(notified).resolves.toBe('Refresh');
    });

    it('emits status views and log lines, and warns through the warn channel', () => {
        const { ports, frames } = setup();
        ports.statusItem.show({ text: 'FeatherSpec', tooltip: { plain: 'tip' }, command: 'copyNextStep' });
        ports.statusItem.hide();
        ports.output.appendBlock(['line one']);
        ports.output.show();
        ports.stepUi.warn('careful');
        expect(frames).toEqual([
            { k: 'emit', channel: 'status', payload: { text: 'FeatherSpec', tooltip: { plain: 'tip' }, command: 'copyNextStep' } },
            { k: 'emit', channel: 'status', payload: null },
            { k: 'emit', channel: 'log', payload: ['line one'] },
            { k: 'emit', channel: 'showOutput', payload: null },
            { k: 'emit', channel: 'warn', payload: 'careful' },
        ]);
    });

    it('sends watch.add per root and kind, routes fileChanged to its listener and stops after dispose', async () => {
        const { ports, frames } = setup();
        const seen: string[] = [];
        const subscription = ports.fileWatch.watch('file:///work/a', (path) => seen.push(path));
        await flush();
        expect(frames.filter((frame) => frame.k === 'call')[0]).toMatchObject({ name: 'watch.add', args: { root: 'file:///work/a', kind: 'files' } });
        ports.routes.fileChanged('file:///work/a', '.specs/active/x.md');
        expect(seen).toEqual(['.specs/active/x.md']);
        subscription.dispose();
        await flush();
        expect(frames.filter((frame) => frame.k === 'call')[1]).toMatchObject({ name: 'watch.remove', args: { root: 'file:///work/a', kind: 'files' } });
        ports.routes.fileChanged('file:///work/a', '.specs/active/x.md');
        expect(seen).toEqual(['.specs/active/x.md']);
    });

    it('routes markerChanged to the marker watch of its root', async () => {
        const { ports, frames } = setup();
        let fired = 0;
        ports.markerWatch.watch('file:///work/a', () => {
            fired += 1;
        });
        await flush();
        expect(frames.filter((frame) => frame.k === 'call')[0]).toMatchObject({ name: 'watch.add', args: { root: 'file:///work/a', kind: 'markers' } });
        ports.routes.markerChanged('file:///work/a');
        expect(fired).toBe(1);
    });

    it('runs withProgress with a signal that routes progressCancelled aborts, and emits progressEnd', async () => {
        const { ports, frames, calls, respond } = setup();
        const pending = ports.setupUi.withProgress('Setting up', (signal) => new Promise<string>((resolve) => {
            signal.addEventListener('abort', () => resolve('aborted'), { once: true });
        }));
        await flush();
        expect(calls()[0]).toMatchObject({ name: 'ui.progressStart', args: { title: 'Setting up' } });
        respond(lastCallIndex(frames), '{"ok":"p1"}');
        await flush();
        ports.routes.progressCancelled('p1');
        await expect(pending).resolves.toBe('aborted');
        expect(frames.at(-1)).toEqual({ k: 'emit', channel: 'progressEnd', payload: 'p1' });
    });

    it('sends http.get with the URL and headers and gives the body as one base64 chunk', async () => {
        const { ports, calls, respond } = setup();
        const pending = ports.http.get('https://example.invalid/a', { headers: { accept: 'application/json' }, signal: new AbortController().signal });
        await flush();
        expect(calls()[0]).toMatchObject({ name: 'http.get', args: { url: 'https://example.invalid/a', headers: { accept: 'application/json' } } });
        respond(0, '{"ok":{"status":200,"headers":{"x":"1"},"body":"AQI="}}');
        const response = await pending;
        expect(response.status).toBe(200);
        expect(response.headers).toEqual({ x: '1' });
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.body) {
            chunks.push(chunk);
        }
        expect(chunks.map((chunk) => Array.from(chunk))).toEqual([[1, 2]]);
    });

    it('sends archive.read with base64 bytes and decodes the entries it gets back', async () => {
        const { ports, calls, respond } = setup();
        const pending = ports.archive.read(new Uint8Array([9]), 1024);
        await flush();
        expect(calls()[0]).toMatchObject({ name: 'archive.read', args: { bytes: 'CQ==', maxUnpackedBytes: 1024 } });
        respond(0, '{"ok":{"ok":true,"entries":[{"path":"a.md","kind":"file","bytes":"aGk="}]}}');
        const result = await pending;
        expect(result).toEqual({ ok: true, entries: [{ path: 'a.md', kind: 'file', bytes: new Uint8Array([104, 105]) }] });
    });

    it('sends target.createExclusive with base64 bytes and returns the outcome', async () => {
        const { ports, calls, respond } = setup();
        const pending = ports.setupTarget.createExclusive('file:///work/a', '.specs/x.md', new Uint8Array([104, 105]));
        await flush();
        expect(calls()[0]).toMatchObject({ name: 'target.createExclusive', args: { root: 'file:///work/a', relativePath: '.specs/x.md', bytes: 'aGk=' } });
        respond(0, '{"ok":"created"}');
        await expect(pending).resolves.toBe('created');
    });

    it('fires the onDidGrant listener once when trustGranted is applied to the mirrors', () => {
        const { ports, mirrors } = setup({ trusted: false });
        let fired = 0;
        ports.trust().onDidGrant(() => {
            fired += 1;
        });
        expect(ports.trust().isTrusted()).toBe(false);
        mirrors.apply('trustGranted', {});
        expect(ports.trust().isTrusted()).toBe(true);
        expect(fired).toBe(1);
    });

    it('answers the platform, the studio version and a case-insensitive sameRoot on win32', () => {
        const { ports } = setup({ platform: 'win32', studioVersion: '1.12.0' });
        expect(ports.platform).toBe('win32');
        expect(ports.studioVersion).toBe('1.12.0');
        expect(ports.sameRoot('file:///C:/A', 'file:///c:/a')).toBe(true);
        expect(setup({ platform: 'linux' }).ports.sameRoot('file:///A', 'file:///a')).toBe(false);
    });

    it('provides a UUID id source and a runtime clock with an epoch and cancellable timers', () => {
        const { ports } = setup();
        expect(ports.ids.newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(ports.runtimeClock.epochMs()).toBeGreaterThan(0);
        const timer = ports.runtimeClock.setTimeout(() => undefined, 1000);
        expect(() => timer.dispose()).not.toThrow();
    });
});
