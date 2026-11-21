import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBridge } from './bridge';
import type { CoreConfig, NativeHost } from './contract';
import { createEmbeddedPorts, type EmbeddedPorts } from './ports';
import { createMirrors } from './mirrors';

const ROOT = 'file:///work/a';

type Kind = 'file' | 'directory' | 'symlink' | 'other';

interface Node {
    kind: Kind;
    mtimeMs: number;
    size: number;
    children?: string[];
}

type Tree = Record<string, Node>;

function baseTree(): Tree {
    return {
        '': { kind: 'directory', mtimeMs: 1, size: 0, children: ['.specs', '.memory-bank', 'AGENTS.md'] },
        '.specs': { kind: 'directory', mtimeMs: 2, size: 0, children: ['active', 'backlog'] },
        '.specs/active': { kind: 'directory', mtimeMs: 3, size: 0, children: ['0001-a.md', '0001-a.plan.md'] },
        '.specs/active/0001-a.md': { kind: 'file', mtimeMs: 4, size: 10 },
        '.specs/active/0001-a.plan.md': { kind: 'file', mtimeMs: 5, size: 20 },
        '.specs/backlog': { kind: 'directory', mtimeMs: 6, size: 0, children: [] },
        '.memory-bank': { kind: 'directory', mtimeMs: 7, size: 0, children: ['activeContext.0001-T-001.md'] },
        '.memory-bank/activeContext.0001-T-001.md': { kind: 'file', mtimeMs: 8, size: 30 },
        'AGENTS.md': { kind: 'file', mtimeMs: 9, size: 40 },
    };
}

function key(relativePath: string): string {
    return relativePath.split('/').filter((part) => part !== '' && part !== '.').join('/');
}

function statOf(tree: Tree, relativePath: string): unknown {
    const node = tree[key(relativePath)];
    return node === undefined ? null : { kind: node.kind, mtimeMs: node.mtimeMs, size: node.size };
}

function listOf(tree: Tree, relativePath: string): unknown {
    const node = tree[key(relativePath)];
    if (node === undefined || node.children === undefined) {
        return null;
    }
    return node.children.map((name) => ({ name, kind: tree[`${key(relativePath)}/${name}`.replace(/^\//, '')]?.kind ?? 'other' }));
}

function scanOf(tree: Tree, dirs: string[]): unknown {
    const entries: Record<string, unknown> = {};
    const visit = (path: string): void => {
        const node = tree[path];
        if (node === undefined) {
            return;
        }
        if (node.kind !== 'directory') {
            entries[path] = { kind: node.kind, mtimeMs: node.mtimeMs, size: node.size };
            return;
        }
        entries[path] = { kind: node.kind, mtimeMs: node.mtimeMs, size: node.size, children: listOf(tree, path) };
        node.children?.forEach((name) => visit(`${path}/${name}`));
    };
    dirs.forEach(visit);
    return { entries };
}

interface Rig {
    ports: EmbeddedPorts;
    tree: Tree;
    names(): string[];
    sent: { name: string; args: Record<string, unknown> }[];
    failScan(): void;
}

function rig(tree: Tree = baseTree()): Rig {
    const sent: { name: string; args: Record<string, unknown> }[] = [];
    let scanFails = false;
    const holder: { bridge?: ReturnType<typeof createBridge> } = {};
    const answer = (name: string, args: Record<string, unknown>): string => {
        const relativePath = String(args.relativePath ?? '');
        switch (name) {
            case 'source.stat':
                return JSON.stringify({ ok: statOf(tree, relativePath) });
            case 'source.list':
                return JSON.stringify({ ok: listOf(tree, relativePath) });
            case 'source.readBytes':
                return JSON.stringify({ ok: 'aGk=' });
            case 'source.scan':
                return scanFails ? JSON.stringify({ error: 'boom' }) : JSON.stringify({ ok: scanOf(tree, args.dirs as string[]) });
            default:
                return JSON.stringify({ ok: null });
        }
    };
    const native: NativeHost = {
        send(frame) {
            type Wire = { id: string; name: string; args: Record<string, unknown> };
            const parsed = JSON.parse(frame) as { k: string; calls?: Wire[] } & Partial<Wire>;
            const calls: Wire[] = parsed.k === 'calls' ? (parsed.calls ?? []) : parsed.k === 'call' ? [parsed as Wire] : [];
            for (const call of calls) {
                sent.push({ name: call.name, args: call.args });
                setTimeout(() => holder.bridge?.resolve(call.id, answer(call.name, call.args)), 0);
            }
        },
    };
    const config: CoreConfig = { host: 'jetbrains', platform: 'linux', studioVersion: '1.12.0', settings: {}, trusted: true, folders: [], memory: {} };
    holder.bridge = createBridge(native);
    const ports = createEmbeddedPorts(holder.bridge, createMirrors(config), config);
    return {
        ports,
        tree,
        sent,
        names: () => sent.map((call) => call.name),
        failScan: () => {
            scanFails = true;
        },
    };
}

async function pass(ports: EmbeddedPorts): Promise<unknown[]> {
    const source = ports.specSource;
    return Promise.all([
        source.stat(ROOT, '.specs'),
        source.stat(ROOT, '.specs/active'),
        source.list(ROOT, '.specs/active'),
        source.stat(ROOT, '.specs/active/0001-a.md'),
        source.stat(ROOT, '.memory-bank'),
        source.list(ROOT, '.memory-bank'),
    ]);
}

function tick(milliseconds = 5): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('embedded spec source scan prefetch (AC-018 update budget)', () => {
    it('answers a burst of stats and lists under the spec folders with one source.scan and no per-call frames', async () => {
        const { ports, names, sent } = rig();
        await pass(ports);
        expect(names()).toEqual(['source.scan']);
        expect(sent[0].args).toEqual({ root: ROOT, dirs: ['.specs', '.memory-bank'] });
    });

    it('answers exactly like the per-call path on the same tree', async () => {
        const cached = rig();
        const direct = rig();
        direct.failScan();
        const paths = ['.specs', '.specs/active', '.specs/backlog', '.specs/active/0001-a.md', '.specs/missing', '.specs/active/0001-a.md/x', '.memory-bank', '.memory-bank/activeContext.0001-T-001.md', '.memory-bank/none.md', '.specs/./active/'];
        const ask = async (target: Rig): Promise<unknown[]> => {
            const answers: unknown[] = [];
            for (const path of paths) {
                answers.push(await target.ports.specSource.stat(ROOT, path), await target.ports.specSource.list(ROOT, path));
            }
            return answers;
        };
        expect(await ask(cached)).toEqual(await ask(direct));
        expect(cached.names().filter((name) => name !== 'source.scan')).toEqual([]);
    });

    it('serves a path absent from a successful scan as missing without asking the host', async () => {
        const tree = baseTree();
        delete tree['.memory-bank'];
        delete tree['.memory-bank/activeContext.0001-T-001.md'];
        const { ports, names } = rig(tree);
        await expect(ports.specSource.stat(ROOT, '.memory-bank')).resolves.toBeUndefined();
        await expect(ports.specSource.list(ROOT, '.memory-bank')).resolves.toBeUndefined();
        await expect(ports.specSource.stat(ROOT, '.specs/nope.md')).resolves.toBeUndefined();
        expect(names()).toEqual(['source.scan']);
    });

    it('leaves paths outside the spec folders and readBytes on the per-call path', async () => {
        const { ports, names } = rig();
        await ports.specSource.stat(ROOT, 'AGENTS.md');
        await ports.specSource.list(ROOT, '');
        await ports.specSource.stat(ROOT, '.specsX');
        await ports.specSource.readBytes(ROOT, '.specs/active/0001-a.md');
        expect(names()).toEqual(['source.stat', 'source.list', 'source.stat', 'source.readBytes']);
    });

    it('sends readBytes to the host even while a scan is fresh', async () => {
        const { ports, names } = rig();
        await ports.specSource.stat(ROOT, '.specs');
        await ports.specSource.readBytes(ROOT, '.specs/active/0001-a.md');
        expect(names()).toEqual(['source.scan', 'source.readBytes']);
    });

    it('falls back to the per-call path for a symlink and anything below it', async () => {
        const tree = baseTree();
        tree['.specs/backlog'] = { kind: 'symlink', mtimeMs: 6, size: 0 };
        const { ports, names } = rig(tree);
        await expect(ports.specSource.stat(ROOT, '.specs/backlog')).resolves.toMatchObject({ kind: 'symlink' });
        await ports.specSource.list(ROOT, '.specs/backlog');
        await ports.specSource.stat(ROOT, '.specs/backlog/x.md');
        expect(names()).toEqual(['source.scan', 'source.list', 'source.stat']);
    });

    it('drops the scan on fileChanged of its root only', async () => {
        const { ports, names } = rig();
        await ports.specSource.stat(ROOT, '.specs');
        ports.routes.fileChanged('file:///work/other', '.specs/x.md');
        await ports.specSource.stat(ROOT, '.specs');
        expect(names()).toEqual(['source.scan']);
        ports.routes.fileChanged(ROOT, '.specs/active/0001-a.md');
        await ports.specSource.stat(ROOT, '.specs');
        expect(names()).toEqual(['source.scan', 'source.scan']);
    });

    it('drops the scan on markerChanged', async () => {
        const { ports, names } = rig();
        await ports.specSource.stat(ROOT, '.specs');
        ports.routes.markerChanged(ROOT);
        await ports.specSource.stat(ROOT, '.specs');
        expect(names()).toEqual(['source.scan', 'source.scan']);
    });

    it('does not let a scan that was in flight at a change serve later requests', async () => {
        const { ports, names } = rig();
        const first = ports.specSource.stat(ROOT, '.specs');
        await tick(0);
        ports.routes.fileChanged(ROOT, '.specs/active/0001-a.md');
        await first;
        await ports.specSource.stat(ROOT, '.specs');
        expect(names()).toEqual(['source.scan', 'source.scan']);
    });

    it('drops the scan when a watch of the root is disposed', async () => {
        const { ports, names } = rig();
        const watch = ports.fileWatch.watch(ROOT, () => undefined);
        await ports.specSource.stat(ROOT, '.specs');
        watch.dispose();
        await ports.specSource.stat(ROOT, '.specs');
        expect(names().filter((name) => name === 'source.scan')).toHaveLength(2);
    });

    it('serves the scan for 100 ms after it resolved and scans again after that', async () => {
        let now = 1_000;
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        const { ports, names } = rig();
        await ports.specSource.stat(ROOT, '.specs');
        now += 100;
        await ports.specSource.stat(ROOT, '.specs');
        expect(names()).toEqual(['source.scan']);
        now += 1;
        await ports.specSource.stat(ROOT, '.specs');
        expect(names()).toEqual(['source.scan', 'source.scan']);
    });

    it('answers every request of a failed scan per call and does not retry the scan within the same window', async () => {
        const target = rig();
        target.failScan();
        const answers = await pass(target.ports);
        expect(answers[0]).toMatchObject({ kind: 'directory' });
        expect(target.names().filter((name) => name === 'source.scan')).toHaveLength(1);
        expect(target.names().filter((name) => name !== 'source.scan')).toHaveLength(6);
    });

    it('scans again after a failed scan once the window has passed', async () => {
        let now = 1_000;
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        const target = rig();
        target.failScan();
        await target.ports.specSource.stat(ROOT, '.specs');
        now += 101;
        await target.ports.specSource.stat(ROOT, '.specs');
        expect(target.names().filter((name) => name === 'source.scan')).toHaveLength(2);
    });

    it('keeps the scans of different roots apart', async () => {
        const { ports, sent } = rig();
        await ports.specSource.stat(ROOT, '.specs');
        await ports.specSource.stat('file:///work/b', '.specs');
        expect(sent.map((call) => call.args.root)).toEqual([ROOT, 'file:///work/b']);
    });
});
