import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { readProject } from '../specs/readProject';
import { buildStartPrompt } from './startPrompt';

const STEM = '0001-ready-feature';
const GOLDEN = path.resolve(__dirname, 'startPrompt.golden.txt');

async function fixtureInput(): Promise<{ stem: string; specPath: string; planPath: string; specText: string }> {
    const root = fixturePath('fs110-ready-synthetic');
    const project = await readProject(createNodeSpecSource(), root, '1.10.0');
    const spec = project.specs.find((entry) => entry.reference === STEM || entry.key.endsWith(`${STEM}.md`));
    if (spec === undefined) {
        throw new Error('fixture spec not found');
    }
    const plan = project.plans.find((entry) => entry.key === spec.planKeys[0]);
    if (plan === undefined) {
        throw new Error('fixture plan not found');
    }
    return { stem: STEM, specPath: spec.key, planPath: plan.key, specText: await fs.readFile(path.join(root, ...spec.key.split('/')), 'utf8') };
}

describe('start prompt (AC-006)', () => {
    it('equals the golden file byte for byte for the fixture spec', async () => {
        const input = await fixtureInput();
        const prompt = buildStartPrompt({ stem: input.stem, specPath: input.specPath, planPath: input.planPath });
        const golden = await fs.readFile(GOLDEN);
        expect(Buffer.from(prompt, 'utf8').equals(golden)).toBe(true);
    });

    it('takes its paths from the project read: backlog paths with forward slashes', async () => {
        const input = await fixtureInput();
        expect(input.specPath).toBe(`.specs/backlog/${STEM}.md`);
        expect(input.planPath).toBe(`.specs/backlog/${STEM}.plan.md`);
    });

    it('detects one changed character (negative control)', async () => {
        const input = await fixtureInput();
        const prompt = buildStartPrompt({ stem: input.stem, specPath: input.specPath, planPath: input.planPath });
        const golden = await fs.readFile(GOLDEN);
        expect(Buffer.from(prompt.replace('Read', 'Reed'), 'utf8').equals(golden)).toBe(false);
    });

    it('detects a CRLF variant (negative control)', async () => {
        const input = await fixtureInput();
        const prompt = buildStartPrompt({ stem: input.stem, specPath: input.specPath, planPath: input.planPath });
        const golden = await fs.readFile(GOLDEN);
        expect(Buffer.from(prompt.replace(/\n/g, '\r\n'), 'utf8').equals(golden)).toBe(false);
        expect(golden.includes(13)).toBe(false);
    });

    it('is one line per paragraph and list item, LF only', async () => {
        const prompt = buildStartPrompt({ stem: STEM, specPath: `.specs/backlog/${STEM}.md`, planPath: `.specs/backlog/${STEM}.plan.md` });
        expect(prompt.includes('\r')).toBe(false);
        expect(prompt.split('\n').filter((line) => line.length > 0)).toHaveLength(7);
        expect(prompt.endsWith('\n')).toBe(false);
    });

    it('replaces every placeholder and holds no file content of the spec', async () => {
        const input = await fixtureInput();
        const prompt = buildStartPrompt({ stem: input.stem, specPath: input.specPath, planPath: input.planPath });
        expect(prompt).not.toMatch(/<stem>|<spec path>|<plan path>/);
        for (const line of input.specText.split('\n').map((candidate) => candidate.trim()).filter((candidate) => candidate.length > 12)) {
            expect(prompt.includes(line)).toBe(false);
        }
    });
});
