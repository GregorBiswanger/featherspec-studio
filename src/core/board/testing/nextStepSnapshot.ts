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

export const WORDING_0026: ReadonlyArray<readonly [string, string]> = [
    ['same chat or new chat', 'current or new chat'],
    ['Same chat or new chat:', 'Current or new chat:'],
    ['what this chat knows', 'what the current chat knows'],
];

export const SHORT_INTENTS_0026: Readonly<Record<string, string>> = {
    'NS-2': 'Move back to Ready',
    'NS-4': 'Find blocker',
    'NS-4-plan': 'Find blocker',
    'NS-6-resume': 'Report',
    'NS-6-plan': 'Write plan',
    'NS-10': 'Write plan',
    'NS-7': 'Start',
};

function withShortIntent(value: SpecSnapshot): unknown {
    const stepCase = (value.nextStep as { case?: string } | null)?.case;
    const short = stepCase === undefined ? undefined : SHORT_INTENTS_0026[stepCase];
    const view = translated(value.stepView) as { intent?: string } | null;
    return short === undefined || view === null ? view : { ...view, intent: short };
}

export function translated(value: unknown): unknown {
    return JSON.parse(WORDING_0026.reduce((text, [from, to]) => text.split(from).join(to), JSON.stringify(value)));
}

const SESSION_0030: Readonly<Record<string, string>> = { 'new chat': 'a new chat', 'current or new chat': 'the current chat or a new one', 'any chat': 'any chat' };
const MODEL_SUFFIX_0030: Readonly<Record<string, string>> = { '': '', ', other family': ' from another model family', ', allow web search': ', and allow web search' };

export function coachTranslated0030(value: unknown): unknown {
    const text = JSON.stringify(value).replace(/"coach":"(new chat|current or new chat|any chat) · (fast|strong) model((?: \([^)]*\))?)(, other family|, allow web search)?"/g, (_all, session: string, model: string, hint: string, suffix: string | undefined) => {
        return `"coach":"Tip: Use ${SESSION_0030[session]} with a ${model} model${hint}${MODEL_SUFFIX_0030[suffix ?? '']}."`;
    });
    return JSON.parse(text);
}

const WORDING_0032_ANY: ReadonlyArray<readonly [string, string]> = [
    ['Not sure where it stands? Let the agent report first', 'Or: not sure where it stands? Let the agent report first'],
    ['Have the spec challenged, then plan it', 'Have the spec challenged'],
];
const WRITES_PLAN_0032 = new Set(['NS-10', 'NS-6-plan']);
const PLAN_TIP_0032: ReadonlyArray<readonly [string, string]> = [
    ['Use any chat with a strong model', 'Use a new chat with a strong model'],
    ['Any chat: the step reads everything it needs from the files.', 'New chat: a fresh session reads the files as a stranger would; what the current chat knows cannot be unread.'],
];

function replaceAll0032(value: unknown, pairs: ReadonlyArray<readonly [string, string]>): unknown {
    return JSON.parse(pairs.reduce((text, [from, to]) => text.split(from).join(to), JSON.stringify(value)));
}

/** 0032 §5: the Baseline's texts that 0032 changes, read as the head writes them. */
function translated0032(value: SpecSnapshot): SpecSnapshot {
    const stepCase = (value.nextStep as { case?: string } | null)?.case;
    let result = replaceAll0032(value, WORDING_0032_ANY) as SpecSnapshot;
    if (stepCase === 'NS-6-report') {
        const next = result.nextStep as { lines: Array<{ intent: string }> };
        const view = result.stepView as { lines?: Array<{ intent: string }> } | null;
        for (const line of [next.lines[1], view?.lines?.[1]]) {
            if (line !== undefined && line.intent.startsWith('Continue with ')) {
                line.intent = `Then: continue with ${line.intent.slice('Continue with '.length)}`;
            }
        }
    }
    if (stepCase !== undefined && WRITES_PLAN_0032.has(stepCase)) {
        result = { ...result, tips: replaceAll0032(result.tips, PLAN_TIP_0032) };
    }
    if (stepCase === 'NS-9') {
        result = { ...result, tips: replaceAll0032(result.tips, PLAN_TIP_0032) };
    }
    return result;
}

export function readBaseline(name: string): ProjectSnapshot {
    const raw = JSON.parse(fs.readFileSync(snapshotFile(name), 'utf8')) as ProjectSnapshot;
    const result: ProjectSnapshot = {};
    for (const [key, value] of Object.entries(raw)) {
        result[key] = translated0032({ ...value, stepView: withShortIntent(value), tips: coachTranslated0030(translated(value.tips)) });
    }
    return result;
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
