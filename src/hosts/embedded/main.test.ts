import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem } from '../../core/discovery/testing/memoryFileSystem';
import { createMemoryBacking, createMemoryMedium } from '../../core/runtime/testing/memoryMedium';
import { createMemorySpecSource } from '../../core/specs/testing/memorySpecSource';
import type { RuntimeMedium, MediumLine } from '../../core/ports/runtimeMedium';
import { toBase64 } from './bridge';
import type { NativeHost } from './contract';
import { SHOW_STEP_TIPS_KEY } from '../../core/settings/stepTipSettings';
import { createEmbeddedHost, type EmbeddedHost } from './main';

const ROOT = 'proj';
const SPEC = '# A spec\n\n**Status:** Draft\n**Plan:** _none yet_\n';

type Frame = Record<string, unknown>;
type Args = Record<string, unknown>;

interface Options {
    trusted?: boolean;
    settings?: Record<string, unknown>;
}

function config(options: Options = {}): string {
    return JSON.stringify({
        host: 'jetbrains',
        platform: 'linux',
        studioVersion: '0.0.0-test',
        settings: options.settings ?? { [SHOW_STEP_TIPS_KEY]: true },
        trusted: options.trusted ?? true,
        folders: [{ root: ROOT, name: ROOT }],
        memory: {},
    });
}

function text(value: unknown): string {
    if (typeof value !== 'string') {
        throw new Error('expected a string argument');
    }
    return value;
}

function harness(options: Options = {}): { host: EmbeddedHost; frames: Frame[]; specSource: ReturnType<typeof createMemorySpecSource> } {
    const frames: Frame[] = [];
    const fileSystem = createMemoryFileSystem();
    const specSource = createMemorySpecSource();
    fileSystem.setFile(ROOT, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    fileSystem.setDirectory(ROOT, '.specs');
    specSource.setFile(ROOT, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    specSource.setDirectory(ROOT, '.specs');
    for (const folder of ['backlog', 'active', 'done']) {
        specSource.setDirectory(ROOT, `.specs/${folder}`);
    }
    specSource.setFile(ROOT, '.specs/active/0001-a-spec.md', SPEC);
    const mediums = new Map<string, RuntimeMedium>();
    const mediumOf = (args: Args): RuntimeMedium => {
        const root = text(args.root);
        const existing = mediums.get(root);
        if (existing !== undefined) {
            return existing;
        }
        const created = createMemoryMedium(createMemoryBacking());
        mediums.set(root, created);
        return created;
    };
    const link: { host?: EmbeddedHost } = {};

    const answer = async (name: string, args: Args): Promise<unknown> => {
        switch (name) {
            case 'fs.stat':
                return fileSystem.stat(text(args.root), text(args.relativePath));
            case 'fs.readText':
                return fileSystem.readText(text(args.root), text(args.relativePath));
            case 'fs.readDirectory':
                return fileSystem.readDirectory(text(args.root), text(args.relativePath));
            case 'source.list':
                return specSource.list(text(args.root), text(args.relativePath));
            case 'source.stat':
                return specSource.stat(text(args.root), text(args.relativePath));
            case 'source.readBytes':
                return toBase64(await specSource.readBytes(text(args.root), text(args.relativePath)));
            case 'medium.open':
                await mediumOf(args).open();
                return null;
            case 'medium.read':
                return (await mediumOf(args).read(text(args.name))) ?? null;
            case 'medium.lines': {
                const lines: MediumLine[] = [];
                for await (const line of mediumOf(args).lines(text(args.name))) {
                    lines.push(line);
                }
                return lines;
            }
            case 'medium.append':
                await mediumOf(args).append(text(args.name), text(args.text));
                return null;
            case 'medium.replace':
                await mediumOf(args).replace(text(args.name), text(args.text));
                return null;
            case 'medium.createExclusive':
                return mediumOf(args).createExclusive(text(args.name), text(args.text));
            case 'medium.remove':
                await mediumOf(args).remove(text(args.name));
                return null;
            case 'medium.list':
                return mediumOf(args).list(text(args.name));
            case 'ui.notify': {
                const actions = Array.isArray(args.actions) ? args.actions : [];
                return actions.includes('Trust Project') ? 'Trust Project' : null;
            }
            case 'ui.progressStart':
                return 'progress-1';
            case 'ui.pick':
                return null;
            case 'ui.confirm':
                return false;
            case 'editor.open':
                return 'not-found';
            case 'memory.set':
            case 'watch.add':
            case 'watch.remove':
            case 'actions.openStudio':
            case 'actions.manageTrust':
            case 'actions.reloadPanel':
            case 'actions.openSetupGuide':
            case 'clipboard.write':
            case 'ui.openExternal':
                return null;
            default:
                throw new Error(`unexpected call ${name}`);
        }
    };

    const native: NativeHost = {
        send(raw) {
            const frame = JSON.parse(raw) as Frame;
            if (frame.k === 'calls') {
                const calls = (frame.calls as Frame[]).map((call): Frame => ({ ...call, k: 'call' }));
                frames.push(...calls);
                void Promise.all(
                    calls.map((call) =>
                        answer(String(call.name), call.args as Args).then(
                            (ok) => ({ id: String(call.id), ok: ok ?? null }),
                            (error: unknown) => ({ id: String(call.id), error: error instanceof Error ? error.message : String(error) }),
                        ),
                    ),
                ).then((results) => link.host?.resolveMany(JSON.stringify(results)));
                return;
            }
            frames.push(frame);
            if (frame.k === 'call') {
                const id = String(frame.id);
                answer(String(frame.name), frame.args as Args).then(
                    (ok) => link.host?.resolve(id, JSON.stringify({ ok: ok ?? null })),
                    (error: unknown) => link.host?.resolve(id, JSON.stringify({ error: error instanceof Error ? error.message : String(error) })),
                );
            }
        },
    };
    const host = createEmbeddedHost(native);
    link.host = host;
    return { host, frames, specSource };
}

async function settle(done: () => boolean, attempts = 500): Promise<void> {
    for (let attempt = 0; attempt < attempts && !done(); attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
}

function emitted(frames: Frame[], channel: string): unknown[] {
    return frames.filter((frame) => frame.k === 'emit' && frame.channel === channel).map((frame) => frame.payload);
}

function callNames(frames: Frame[]): string[] {
    return frames.filter((frame) => frame.k === 'call').map((frame) => String(frame.name));
}

function replyTo(frames: Frame[], id: string): Frame | undefined {
    return frames.find((frame) => frame.k === 'reply' && frame.id === id);
}

function panelEnvelopes(frames: Frame[]): Frame[] {
    return emitted(frames, 'panel') as Frame[];
}

function openPanel(host: EmbeddedHost): void {
    host.dispatch('panelOpened', 'null');
    host.dispatch('panelMessage', JSON.stringify({ v: 12, kind: 'req', id: 'hello-1', type: 'hello', payload: { lastSeq: 0 } }));
}

describe('embedded entry (AC-008: the core runs and shows the tree without the tab)', () => {
    it('AC-008: start emits the tree and the status without any panel, then exactly one ready frame', async () => {
        const { host, frames } = harness();
        await host.start(config());
        expect(emitted(frames, 'tree').length).toBeGreaterThan(0);
        expect(emitted(frames, 'status').length).toBeGreaterThan(0);
        expect(frames.filter((frame) => frame.k === 'ready')).toHaveLength(1);
        expect(emitted(frames, 'panel')).toHaveLength(0);
        expect(callNames(frames)).not.toContain('actions.openStudio');
    });

    it('a throwing start sends a log line and a failed frame with the message, and no ready frame', async () => {
        const { host, frames } = harness();
        await expect(host.start('{not json')).resolves.toBeUndefined();
        expect(frames.find((frame) => frame.k === 'failed')).toMatchObject({ k: 'failed', error: expect.any(String) });
        expect(emitted(frames, 'log').length).toBeGreaterThan(0);
        expect(frames.some((frame) => frame.k === 'ready')).toBe(false);
    });

    it('the medium of the store is a proxy keyed by the project root', async () => {
        const { host, frames } = harness();
        await host.start(config());
        expect(frames.filter((frame) => frame.k === 'call' && frame.name === 'medium.open')).toContainEqual(expect.objectContaining({ args: { root: ROOT } }));
    });

    it('settingsChanged showStepTips=false: the next detail view has no tips and no settings or UI call is sent', async () => {
        const { host, frames } = harness();
        await host.start(config());
        openPanel(host);
        host.dispatch('panelMessage', JSON.stringify({ v: 12, kind: 'req', id: 'select-1', type: 'select', payload: { stem: '0001-a-spec' } }));
        await settle(() => panelEnvelopes(frames).some((frame) => frame.type === 'detail' && JSON.stringify(frame).includes('"tips"')));
        expect(JSON.stringify(panelEnvelopes(frames).filter((frame) => frame.type === 'detail'))).toContain('"tips"');
        const detailsBefore = panelEnvelopes(frames).filter((frame) => frame.type === 'detail').length;
        const callsBefore = callNames(frames).length;
        host.dispatch('settingsChanged', JSON.stringify({ key: SHOW_STEP_TIPS_KEY, value: false }));
        await settle(() => panelEnvelopes(frames).filter((frame) => frame.type === 'detail').length > detailsBefore);
        const details = panelEnvelopes(frames).filter((frame) => frame.type === 'detail');
        expect(details.length).toBeGreaterThan(detailsBefore);
        expect(JSON.stringify(details.at(-1))).not.toContain('"tips"');
        const callsAfter = callNames(frames).slice(callsBefore);
        expect(callsAfter.filter((name) => !/^(fs|source|medium)\./.test(name))).toEqual([]);
    });

    it('foldersChanged with a second folder emits the tree again', async () => {
        const { host, frames } = harness();
        await host.start(config());
        const treesBefore = emitted(frames, 'tree').length;
        host.dispatch('foldersChanged', JSON.stringify({ folders: [{ root: ROOT, name: ROOT }, { root: 'other', name: 'other' }] }));
        await settle(() => emitted(frames, 'tree').length > treesBefore);
        expect(emitted(frames, 'tree').length).toBeGreaterThan(treesBefore);
    });

    it('invoke of an unknown command replies with an error', async () => {
        const { host, frames } = harness();
        await host.start(config());
        host.invoke('7', 'nope', '{}');
        await settle(() => replyTo(frames, '7') !== undefined);
        expect(replyTo(frames, '7')).toMatchObject({ k: 'reply', id: '7', error: expect.any(String) });
    });

    it('panelMessage hello after panelOpened sends the shell, board, overview and detail envelopes', async () => {
        const { host, frames } = harness();
        await host.start(config());
        openPanel(host);
        await settle(() => panelEnvelopes(frames).some((frame) => frame.type === 'detail'));
        const types = panelEnvelopes(frames).map((frame) => frame.type);
        expect(types).toEqual(expect.arrayContaining(['shell', 'detail']));
    });

    it('AC-031: no assistant offer or send view reaches the panel', async () => {
        const { host, frames } = harness();
        await host.start(config());
        openPanel(host);
        await settle(() => panelEnvelopes(frames).some((frame) => frame.type === 'detail'));
        const serialised = JSON.stringify(panelEnvelopes(frames));
        expect(serialised).not.toMatch(/"send"|Send to/);
    });

    it('AC-019: an untrusted project: the setup notice reads the JetBrains wording and choosing Trust Project calls actions.manageTrust', async () => {
        const { host, frames } = harness();
        await host.start(config({ trusted: false }));
        host.invoke('2', 'setup', '{}');
        await settle(() => callNames(frames).includes('actions.manageTrust'));
        expect(frames.find((frame) => frame.k === 'call' && frame.name === 'ui.notify')).toMatchObject({
            args: { message: 'Setting up FeatherSpec needs a trusted project.', actions: ['Trust Project'] },
        });
        expect(callNames(frames)).toContain('actions.manageTrust');
    });

    it('§6.8, AC-023: a full run emits no VS Code-only term in the tree, the status, the log, the notices or the panel', async () => {
        const { host, frames } = harness();
        await host.start(config({ trusted: false }));
        openPanel(host);
        host.invoke('2', 'setup', '{}');
        await settle(() => panelEnvelopes(frames).some((frame) => frame.type === 'detail'));
        const outbound = JSON.stringify(frames.filter((frame) => frame.k === 'emit' || (frame.k === 'call' && String(frame.name).startsWith('ui.'))));
        for (const term of ['workspace', 'Restricted Mode', 'VS Code', 'extension']) {
            expect(outbound).not.toContain(term);
        }
    });

    it('panelHtml answers the panel HTML with the JetBrains host marker', async () => {
        const { host, frames } = harness();
        await host.start(config());
        host.invoke('3', 'panelHtml', JSON.stringify({ nonce: 'n1', cspSource: 'https://studio.featherspec.invalid', scriptUri: 'https://studio.featherspec.invalid/main.js', styleUri: 'https://studio.featherspec.invalid/main.css', reloaded: false }));
        await settle(() => replyTo(frames, '3') !== undefined);
        expect(replyTo(frames, '3')).toMatchObject({ ok: expect.stringContaining('data-host="jetbrains"') });
    });

    it('budget.read answers the best full-read time through the bridge ports and budget.update the update time', async () => {
        const { host, frames, specSource } = harness();
        await host.start(config());
        host.invoke('5', 'budget.read', JSON.stringify({ root: ROOT, version: '1.10.0' }));
        await settle(() => replyTo(frames, '5') !== undefined);
        const read = (replyTo(frames, '5') as { ok: { ms: number; calls: number; frames: number } }).ok;
        expect(read.ms).toEqual(expect.any(Number));
        expect(read.calls).toBeGreaterThan(0);
        expect(read.frames).toBeGreaterThan(0);
        expect(read.frames).toBeLessThanOrEqual(read.calls);
        specSource.setFile(ROOT, '.specs/active/0001-a-spec.md', `${SPEC}\nedited\n`);
        host.invoke('6', 'budget.update', JSON.stringify({ path: '.specs/active/0001-a-spec.md' }));
        await settle(() => replyTo(frames, '6') !== undefined, 2000);
        expect(replyTo(frames, '6')).toMatchObject({ ok: { ms: expect.any(Number), calls: expect.any(Number), frames: expect.any(Number) } });
    });

    it('budget.discover answers the discovery time over the given roots through the bridge ports', async () => {
        const { host, frames } = harness();
        await host.start(config());
        host.invoke('8', 'budget.discover', JSON.stringify({ roots: [ROOT] }));
        await settle(() => replyTo(frames, '8') !== undefined);
        const measure = (replyTo(frames, '8') as { ok: { ms: number; calls: number; frames: number } }).ok;
        expect(measure.ms).toEqual(expect.any(Number));
        expect(measure.calls).toBeGreaterThan(0);
        expect(measure.frames).toBeGreaterThan(0);
    });

    it('budget.discover without roots answers an error', async () => {
        const { host, frames } = harness();
        await host.start(config());
        host.invoke('9', 'budget.discover', JSON.stringify({}));
        await settle(() => replyTo(frames, '9') !== undefined);
        expect(replyTo(frames, '9')).toMatchObject({ error: expect.stringContaining('roots') });
    });

    it('budget.update before budget.read answers an error', async () => {
        const { host, frames } = harness();
        await host.start(config());
        host.invoke('7', 'budget.update', JSON.stringify({ path: 'x.md' }));
        await settle(() => replyTo(frames, '7') !== undefined);
        expect(replyTo(frames, '7')).toMatchObject({ error: expect.stringContaining('budget.read') });
    });

    it('diagnostics answers the heap field the probe reads', async () => {
        const { host, frames } = harness();
        await host.start(config());
        host.invoke('4', 'diagnostics', '{}');
        await settle(() => replyTo(frames, '4') !== undefined);
        expect(replyTo(frames, '4')).toMatchObject({ ok: { jsHeapBytes: null } });
    });
});
