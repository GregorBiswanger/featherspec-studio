import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..', '..');
const outRoot = path.join(here, '..', 'build');
const FIXTURE = 'studio-0015';
const SPEC_STEM = '0015-focus-on-visibility';

const modules = {
    filters: path.join(repo, 'src', 'core', 'board', 'filters.ts'),
    cards: path.join(repo, 'src', 'core', 'board', 'cards.ts'),
    detail: path.join(repo, 'src', 'core', 'board', 'detail.ts'),
    overview: path.join(repo, 'src', 'core', 'overview', 'overviewView.ts'),
    lifecycle: path.join(repo, 'src', 'core', 'lifecycle', 'deriveLifecycle.ts'),
    readProject: path.join(repo, 'src', 'core', 'specs', 'readProject.ts'),
    tips: path.join(repo, 'src', 'core', 'settings', 'stepTipSettings.ts'),
    fixtures: path.join(repo, 'src', 'core', 'discovery', 'testing', 'fixtures.ts'),
    nodeSource: path.join(repo, 'src', 'adapters', 'node', 'nodeSpecSource.ts'),
};

const ENTRY = `
import { arrangeBoard } from ${JSON.stringify(modules.filters)};
import { buildBanner, buildCards } from ${JSON.stringify(modules.cards)};
import { buildDetail } from ${JSON.stringify(modules.detail)};
import { buildOverviewView } from ${JSON.stringify(modules.overview)};
import { deriveLifecycle } from ${JSON.stringify(modules.lifecycle)};
import { readProject } from ${JSON.stringify(modules.readProject)};
import { parseStepTipSettings } from ${JSON.stringify(modules.tips)};
import { fixturePath } from ${JSON.stringify(modules.fixtures)};
import { createNodeSpecSource } from ${JSON.stringify(modules.nodeSource)};

const SHELL_BOARD = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };

export async function reply(name, specStem) {
    const project = await readProject(createNodeSpecSource(), fixturePath(name), '1.10.0');
    const lifecycle = deriveLifecycle(project);
    const model = { project, lifecycle };
    const history = { available: true, label: 'Observed', entries: [] };
    const cards = buildCards(project, lifecycle);
    const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: cards.length === 0, planSpecs: [] };
    const tips = parseStepTipSettings(true, {});
    return {
        shell: { v: 11, kind: 'evt', seq: 1, type: 'shell', payload: { view: SHELL_BOARD } },
        board: { v: 11, kind: 'evt', type: 'board', payload: { view: board } },
        overview: { v: 11, kind: 'evt', type: 'overview', payload: { view: buildOverviewView({ model, history }) } },
        detail: { v: 11, kind: 'evt', type: 'detail', payload: { view: buildDetail({ selection: { stem: specStem }, model, history, tips }) } },
    };
}
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spike-reply-'));
const bundle = path.join(tmp, 'reply.mjs');
await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: here, sourcefile: 'reply-entry.js', loader: 'js' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    logLevel: 'silent',
});
const { reply } = await import(pathToFileURL(bundle).href);
const envelopes = await reply(FIXTURE, SPEC_STEM);

fs.mkdirSync(outRoot, { recursive: true });
const target = path.join(outRoot, 'hello-reply.json');
fs.writeFileSync(target, JSON.stringify(envelopes));
console.log(`wrote: ${path.relative(repo, target)} (${Object.keys(envelopes).join(', ')})`);
fs.rmSync(tmp, { recursive: true, force: true });
