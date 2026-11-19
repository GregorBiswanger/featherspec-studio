import * as fs from 'fs';
import * as path from 'path';
import { fixturePath } from '../../discovery/testing/fixtures';
import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { fixtureVersion, readFixture, readMemory } from '../../lifecycle/testing/projects';
import type { ShellModel } from '../../ports/shell';
import { parseStepTipSettings } from '../../settings/stepTipSettings';
import { nextStep, stepView } from '../nextStep';
import { stepTips } from '../stepTips';
import { CASE_FIXTURES } from './caseFixtures';

export const BASELINE_COMMIT = 'f9cadb4';
export const REPO_FIXTURE = `repo-${BASELINE_COMMIT}`;
export const SNAPSHOT_DIR = path.join('test', 'fixtures', 'next-step-baseline');

export interface SpecSnapshot {
    state: string;
    rule: string;
    persistence: string;
    nextStep: unknown;
    stepView: unknown;
    tips: unknown;
}

export type ProjectSnapshot = Record<string, SpecSnapshot>;

const DEFAULT_SETTINGS = parseStepTipSettings(undefined, undefined);

function plain<T>(value: T): unknown {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

export function snapshotOf(model: ShellModel): ProjectSnapshot {
    const result: ProjectSnapshot = {};
    for (const entry of model.lifecycle.entries) {
        const next = nextStep(model, entry.key);
        result[entry.key] = {
            state: entry.state,
            rule: entry.rule,
            persistence: entry.persistence,
            nextStep: plain(next),
            stepView: plain(stepView(model, entry.key)),
            tips: next !== undefined && 'case' in next ? plain(stepTips(next.case, DEFAULT_SETTINGS, undefined, { version: model.project.version, ...(next.reason === undefined ? {} : { reason: next.reason }) })) : null,
        };
    }
    return result;
}

export function fixtureProjectNames(): string[] {
    const root = fixturePath('');
    return fs
        .readdirSync(root)
        .filter((name) => fs.existsSync(path.join(root, name, '.specs')))
        .sort();
}

export async function modelOfFixture(name: string): Promise<ShellModel> {
    const project = await readFixture(name, name === REPO_FIXTURE ? '1.10.0' : fixtureVersion(name));
    return { project, lifecycle: deriveLifecycle(project) };
}

export async function modelOfCase(name: string, version?: string): Promise<ShellModel> {
    const files = CASE_FIXTURES[name];
    if (files === undefined) {
        throw new Error(`no case fixture ${name}`);
    }
    const project = await readMemory(files, version);
    return { project, lifecycle: deriveLifecycle(project) };
}

export function snapshotFile(name: string): string {
    return path.resolve(process.cwd(), SNAPSHOT_DIR, `${name}.json`);
}

export async function allBaselineNames(): Promise<Array<{ name: string; kind: 'fixture' | 'case' }>> {
    return [...fixtureProjectNames().map((name) => ({ name, kind: 'fixture' as const })), ...Object.keys(CASE_FIXTURES).map((name) => ({ name, kind: 'case' as const }))];
}

export async function modelOfBaseline(entry: { name: string; kind: 'fixture' | 'case' }): Promise<ShellModel> {
    return entry.kind === 'fixture' ? modelOfFixture(entry.name) : modelOfCase(entry.name);
}

export async function writeBaseline(): Promise<number> {
    const names = await allBaselineNames();
    fs.mkdirSync(path.resolve(process.cwd(), SNAPSHOT_DIR), { recursive: true });
    for (const entry of names) {
        const text = `${JSON.stringify(snapshotOf(await modelOfBaseline(entry)), null, 2)}\n`;
        fs.writeFileSync(snapshotFile(entry.kind === 'case' ? `case-${entry.name}` : entry.name), text);
    }
    return names.length;
}
