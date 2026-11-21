import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { build, type BuildOptions } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { snapshotOf } from '../../core/board/testing/nextStepSnapshot';
import { deriveLifecycle } from '../../core/lifecycle/deriveLifecycle';
import { readProject } from '../../core/specs/readProject';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { generateProject } from '../../core/specs/testing/generateProject';
import { WEAK_INPUTS, conformanceInput } from './testing/conformanceInput';
import { readSnapshot } from '../../core/specs/testing/readSnapshot';
import { createTarGzArchive } from '../../adapters/node/tarGzArchive';
import type { ArchiveReadResult } from '../../core/ports/releaseArchive';
import { fromBase64, isRecord, toBase64 } from './bridge';
import { runConformance, runSetupConformance } from './conformance';
import { browserContext } from './testing/browserContext';

const root = path.resolve(__dirname, '..', '..', '..');
const fixturesRoot = path.join(root, 'test', 'fixtures');
const esbuildScript = path.join(root, 'esbuild.js');
const embeddedOptions = createRequire(esbuildScript)('./esbuild.js').embeddedBuildOptions as BuildOptions;
const SKIPPED = new Set(['next-step-baseline', 'read-baseline', 'setup']);
const fixtures = readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIPPED.has(entry.name))
    .map((entry) => entry.name)
    .sort();
const SETUP_ARCHIVE = path.join(fixturesRoot, 'setup', 'featherspec-1.10.0.tar.gz');
const GOLDEN_MERGE_PROMPT = path.join(root, 'src', 'core', 'setup', 'mergePrompt.golden.txt');

interface Frame {
    k: string;
    id?: string;
    name?: string;
    args?: { bytes: string; maxUnpackedBytes: number };
    calls?: Frame[];
    ok?: unknown;
    error?: string;
}

interface EmbeddedGlobal {
    resolve(id: string, resultJson: string): void;
    resolveMany(batchJson: string): void;
    conformance(id: string, inputJson: string): void;
    setupConformance(id: string, archiveJson: string): void;
}

interface Loaded {
    host: EmbeddedGlobal;
    frames: Frame[];
}

interface Parts {
    read: unknown;
    next: unknown;
    board: unknown;
    overview: unknown;
    planSpecs: unknown;
    details: Record<string, unknown>;
    tree: unknown;
    status: unknown;
}

const SYNTHETIC_AGENTS = readFileSync(path.join(fixturesRoot, 'fs-version-1110', 'AGENTS.md')).toString('base64');
const NOT_ACTIVE = ['incomplete-agents-only', 'incomplete-specs-only', 'nested-project', 'not-fs-agents-only', 'not-fs-claude-md-only', 'not-fs-memory-bank-only', 'not-fs-speckit'];

function inputOf(name: string): ReturnType<typeof conformanceInput> {
    return conformanceInput(name, collect(path.join(fixturesRoot, name)), SYNTHETIC_AGENTS);
}

interface SetupParts {
    mergePrompt: string;
}

let bundleText = '';

function collect(directory: string, prefix = '', files: Record<string, string> = {}): Record<string, string> {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collect(full, relative, files);
        } else {
            files[relative] = readFileSync(full).toString('base64');
        }
    }
    return files;
}

function wire(result: ArchiveReadResult): unknown {
    if (result.ok) {
        return { ok: true, entries: result.entries.map((entry) => ({ path: entry.path, kind: entry.kind, bytes: toBase64(entry.bytes) })) };
    }
    return result.failure === 'unreadable' ? { ok: false, failure: 'unreadable', detail: result.detail } : { ok: false, failure: 'too-large' };
}

function load(text: string): Loaded {
    const frames: Frame[] = [];
    const archive = createTarGzArchive();
    const loaded: { host?: EmbeddedGlobal } = {};
    const context = browserContext({
        __featherspecNative: (raw: string): void => {
            const frame = JSON.parse(raw) as Frame;
            frames.push(frame);
            const calls = frame.k === 'calls' ? (frame.calls ?? []) : [frame];
            const archived = calls.filter((call) => call.k !== 'reply' && call.name === 'archive.read' && call.id !== undefined && call.args !== undefined);
            void Promise.all(
                archived.map(async (call) => {
                    const { bytes, maxUnpackedBytes } = call.args as { bytes: string; maxUnpackedBytes: number };
                    return { id: call.id as string, ok: wire(await archive.read(fromBase64(bytes), maxUnpackedBytes)) };
                }),
            ).then((results) => {
                if (results.length > 0) {
                    loaded.host?.resolveMany(JSON.stringify(results));
                }
            });
        },
    });
    vm.runInContext(text, context);
    loaded.host = context.FeatherSpecHost as EmbeddedGlobal;
    return { host: loaded.host, frames };
}

async function replyOf(frames: Frame[], id: string): Promise<unknown> {
    const deadline = Date.now() + 120_000;
    for (;;) {
        const frame = frames.find((candidate) => candidate.k === 'reply' && candidate.id === id);
        if (frame !== undefined) {
            if (frame.error !== undefined) {
                throw new Error(frame.error);
            }
            return frame.ok;
        }
        if (Date.now() > deadline) {
            throw new Error(`No reply for ${id}.`);
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

describe('embedded conformance oracle (0034 T-018, AC-004, AC-005)', () => {
    beforeAll(async () => {
        const built = await build({ ...embeddedOptions, write: false, logLevel: 'silent', plugins: embeddedOptions.plugins?.filter((plugin) => plugin.name === 'embedded-path-shim') ?? [] });
        bundleText = built.outputFiles?.[0]?.text ?? '';
    }, 120_000);

    it('AC-004: the bundle answers every fixture with the same string as the in-process run', async () => {
        const { host, frames } = load(bundleText);
        for (const name of fixtures) {
            const input = inputOf(name);
            const id = `conformance-${name}`;
            host.conformance(id, JSON.stringify(input));
            expect(await replyOf(frames, id), name).toBe(await runConformance(input));
        }
    }, 600_000);

    it('AC-004: the in-process conformance reports every fixture as readSnapshot and snapshotOf do', async () => {
        for (const name of fixtures) {
            const input = inputOf(name);
            const parts = JSON.parse(await runConformance(input)) as Parts;
            const copy = mkdtempSync(path.join(os.tmpdir(), 'conformance-'));
            try {
                cpSync(path.join(fixturesRoot, name), copy, { recursive: true });
                writeFileSync(path.join(copy, 'AGENTS.md'), fromBase64(input.files['AGENTS.md'] ?? ''));
                const project = await readProject(createNodeSpecSource(), copy, input.version);
                expect(parts.read, name).toEqual(readSnapshot(project));
                expect(parts.next, name).toEqual(snapshotOf({ project, lifecycle: deriveLifecycle(project) }));
            } finally {
                rmSync(copy, { recursive: true, force: true });
            }
        }
    }, 600_000);

    it('AC-004: every FeatherSpec fixture output has board, overview, plan map, tree and status entry; the weak inputs have a board and details', async () => {
        for (const name of fixtures) {
            const parts = JSON.parse(await runConformance(inputOf(name))) as Parts;
            expect(parts.tree, name).toBeDefined();
            expect(parts.status, name).toBeDefined();
            for (const key of ['board', 'overview', 'planSpecs'] as const) {
                if (NOT_ACTIVE.includes(name)) {
                    expect(parts[key] ?? null, `${name} ${key}`).toBeNull();
                } else {
                    expect(parts[key], `${name} ${key}`).toBeTruthy();
                }
            }
        }
        const generated = mkdtempSync(path.join(os.tmpdir(), 'conformance-gen-'));
        try {
            await generateProject(generated, 200);
            for (const name of WEAK_INPUTS) {
                const files = collect(name === 'gen-200' ? generated : path.join(fixturesRoot, name));
                const parts = JSON.parse(await runConformance(conformanceInput(name, files, SYNTHETIC_AGENTS))) as Parts;
                const details = Object.values(parts.details);
                expect(parts.board, name).toBeTruthy();
                expect(details.length, name).toBeGreaterThan(0);
                expect(details.every((detail) => isRecord(detail) && detail.kind !== 'none'), name).toBe(true);
            }
        } finally {
            rmSync(generated, { recursive: true, force: true });
        }
    }, 600_000);

    it('AC-005: the setup conformance yields the golden merge prompt and the same classes and writes in the bundle', async () => {
        const archive = readFileSync(SETUP_ARCHIVE).toString('base64');
        const expected = await runSetupConformance(archive, createTarGzArchive());
        const { host, frames } = load(bundleText);
        host.setupConformance('setup', JSON.stringify(archive));
        expect(await replyOf(frames, 'setup')).toBe(expected);
        expect((JSON.parse(expected) as SetupParts).mergePrompt).toBe(readFileSync(GOLDEN_MERGE_PROMPT, 'utf8'));
    }, 600_000);
});
