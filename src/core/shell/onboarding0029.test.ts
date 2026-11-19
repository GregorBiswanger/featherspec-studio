import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { createFakeOffer } from '../assistant/testing/fakeOffer';
import { nextStep } from '../board/nextStep';
import { createBoardWorld } from '../board/testing/boardWorld';
import { fixtureProjectNames, modelOfFixture } from '../board/testing/nextStepSnapshot';
import { readSetupSign, type SetupRun } from '../discovery/setupSign';
import { fixturePath } from '../discovery/testing/fixtures';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { buildOverviewView } from '../overview/overviewView';
import type { ShellModel } from '../ports/shell';
import { readProject } from '../specs/readProject';
import { buildSpecTree } from './specTree';

const HISTORY = { available: true as const, label: 'Observed', entries: [] };

function signOf(root: string): SetupRun {
    const read = (relative: string): string | undefined => (existsSync(path.join(root, relative)) ? readFileSync(path.join(root, relative), 'utf8') : undefined);
    return readSetupSign(read('AGENTS.md'), read('.memory-bank/projectbrief.md'));
}

function withSign(model: ShellModel, setupRun: SetupRun): ShellModel {
    return { ...model, project: { ...model.project, setupRun } };
}

async function surfaces(model: ShellModel) {
    const board = createBoardWorld(model, undefined, undefined, createFakeOffer({ assistant: 'claudeCode' }));
    await board.service.whenIdle();
    const keys = model.lifecycle.entries.map((entry) => entry.key);
    return {
        overview: buildOverviewView({ model, history: HISTORY, offer: { assistant: 'claudeCode' } }),
        board: board.service.view(),
        tree: buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model }),
        steps: keys.map((key) => nextStep(model, key)),
    };
}

function withoutUpNextFlag<T extends { overview: { upNext: object } }>(value: T): T {
    const { setup: _setup, ...upNext } = value.overview.upNext as { setup?: true };
    return { ...value, overview: { ...value.overview, upNext } };
}

describe('0029 AC-010: every project keeps its surfaces; only the sign changes the empty ones', () => {
    const names = fixtureProjectNames();

    it('0029 AC-010 the fixture list holds the two new projects and the projects of the earlier rounds', () => {
        expect(names).toContain('fs-setup-not-run');
        expect(names).toContain('fs-setup-done-no-specs');
        expect(names).toContain('fs180-de-baselines');
        expect(names.length).toBeGreaterThanOrEqual(20);
    });

    it.each(names.filter((name) => !['fs-setup-not-run', 'fs180-de-baselines'].includes(name)))(
        '0029 AC-010 %s renders Overview, Board, tree and next steps as with the sign forced to run or unknown',
        async (name) => {
            expect(signOf(fixturePath(name)), name).toBe('run or unknown');
            const model = await modelOfFixture(name);
            const plain = await surfaces(withSign(model, 'run or unknown'));
            expect(await surfaces(withSign(model, signOf(fixturePath(name))))).toEqual(plain);
            expect(await surfaces(model)).toEqual(plain);
        },
    );

    it('0029 AC-010 fs180-de-baselines reads setup not run and differs only in the Up next line, and only where it has no Up next row', async () => {
        const root = fixturePath('fs180-de-baselines');
        expect(signOf(root)).toBe('not run');
        const model = await modelOfFixture('fs180-de-baselines');
        const forced = await surfaces(withSign(model, 'run or unknown'));
        const real = await surfaces(withSign(model, 'not run'));
        expect(withoutUpNextFlag(real)).toEqual(forced);
        expect(real.overview.upNext.rows).toHaveLength(0);
        expect(real.overview.upNext.setup).toBe(true);
        expect('welcome' in real.overview).toBe(false);
    });

    it('0029 AC-010 this repository renders as before', async () => {
        const project = await readProject(createNodeSpecSource(), process.cwd(), '1.11.0');
        const model: ShellModel = { project, lifecycle: deriveLifecycle(project) };
        expect(signOf(process.cwd())).toBe('run or unknown');
        expect(await surfaces(withSign(model, signOf(process.cwd())))).toEqual(await surfaces(withSign(model, 'run or unknown')));
    });

    it('0029 AC-006 the AC-002 variants that read run or unknown render as today (empty states of the fixture, Overview and tree)', async () => {
        const model = await modelOfFixture('fs-setup-not-run');
        const plain = await surfaces(withSign(model, 'run or unknown'));
        expect(plain.overview.figures).toEqual({ kind: 'empty' });
        expect('welcome' in plain.overview).toBe(false);
        expect(plain.tree.message).toBe('No specs yet. Start with /sdd-specify');
        expect(plain.board?.noSpecs).toBe(true);
        expect('welcome' in (plain.board ?? {})).toBe(false);
    });

    it('0029 AC-010 negative control: forcing not run on fs-setup-done-no-specs changes the render', async () => {
        const model = await modelOfFixture('fs-setup-done-no-specs');
        expect(signOf(fixturePath('fs-setup-done-no-specs'))).toBe('run or unknown');
        const plain = await surfaces(withSign(model, 'run or unknown'));
        const forced = await surfaces(withSign(model, 'not run'));
        expect(forced).not.toEqual(plain);
        expect(forced.overview.welcome).toBeDefined();
        expect(forced.tree.message).toContain('/sdd-setup');
    });

    it('0029 AC-001 the fixture fs-setup-not-run renders the welcome on every surface', async () => {
        const model = await modelOfFixture('fs-setup-not-run');
        const real = await surfaces(withSign(model, signOf(fixturePath('fs-setup-not-run'))));
        expect(real.overview.welcome).toEqual({ send: { assistant: 'claudeCode', target: 'new', targets: ['new'] } });
        expect(real.board?.welcome).toEqual(real.overview.welcome);
        expect(real.tree.message).toContain('Welcome to FeatherSpec');
        expect(real.steps).toEqual([]);
    });
});
