import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { fixturePath } from '../../discovery/testing/fixtures';
import { modelOf } from '../../board/testing/boardWorld';
import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { ROOT, VERSION } from '../../lifecycle/testing/projects';
import { readProject } from '../../specs/readProject';
import { createMemorySpecSource } from '../../specs/testing/memorySpecSource';
import type { ShellModel } from '../../ports/shell';

function walk(root: string, relative: string, found: Record<string, string>): void {
    if (!existsSync(path.join(root, relative))) {
        return;
    }
    for (const name of readdirSync(path.join(root, relative))) {
        const next = relative === '' ? name : `${relative}/${name}`;
        if (statSync(path.join(root, next)).isDirectory()) {
            walk(root, next, found);
        } else if (name !== '.gitkeep' && /\.md$/.test(name)) {
            found[next] = readFileSync(path.join(root, next), 'utf8');
        }
    }
}

export function fixtureFiles(name: string): Record<string, string> {
    const root = fixturePath(name);
    const found: Record<string, string> = {};
    for (const folder of ['.specs', '.memory-bank']) {
        walk(root, folder, found);
    }
    return found;
}

export type Edit = (files: Record<string, string>) => void;

export async function fixtureModel(name: string, ...edits: Edit[]): Promise<ShellModel> {
    const files = fixtureFiles(name);
    edits.forEach((edit) => edit(files));
    return modelOf(files);
}

export function dropNotes(files: Record<string, string>): void {
    for (const key of Object.keys(files)) {
        if (/\/activeContext\.[^/]+\.md$/.test(key)) {
            delete files[key];
        }
    }
}

export function setPlanStatus(planKey: string, status: string): Edit {
    return (files) => {
        files[planKey] = files[planKey]!.replace(/^\*\*Status:\*\* .*$/m, `**Status:** ${status}`);
    };
}

export function replaceIn(key: string, from: string, to: string): Edit {
    return (files) => {
        if (!files[key]!.includes(from)) {
            throw new Error(`fixture ${key} lacks ${from}`);
        }
        files[key] = files[key]!.replace(from, to);
    };
}

export function setNote(key: string, text: string): Edit {
    return (files) => {
        files[key] = text;
    };
}

export const PARALLEL_SPEC = '.specs/active/0001-parallel-demo.md';
export const PARALLEL_PLAN = '.specs/active/0001-parallel-demo.plan.md';
export const PARALLEL_NOTE_3 = '.memory-bank/activeContext.0001-T-003.md';
export const PARALLEL_NOTE_4 = '.memory-bank/activeContext.0001-T-004.md';

export function parallelModel(...edits: Edit[]): Promise<ShellModel> {
    return fixtureModel('fs110-parallel-synthetic', dropNotes, setPlanStatus(PARALLEL_PLAN, 'In Progress'), ...edits);
}

export const GEN_SPEC = '.specs/active/0007-gen.md';
export const GEN_PLAN = '.specs/active/0007-gen.plan.md';

export interface GeneratedOptions {
    stages?: string;
    steps?: string[];
    closing?: string | null;
    planStatus?: string;
}

const DEFAULT_STAGES = [
    '1. T-001 — single step',
    '2. T-002 → T-003 — sequential, the second is dropped',
    '3. T-004 ‖ T-005 — parallel: separate files',
    '4. T-006 ‖ T-007 → T-008 — mixed, parallel before the arrow',
    '   with a continuation line',
    '5. T-009 → T-010 ‖ T-011 — mixed, parallel after the arrow',
    '6. Prose without any step — left out',
    '7. T-012 → T-099 — an unknown ID',
].join('\n');

function stepBlock(id: string, mark: string, extra = ''): string {
    const struck = mark === '~~';
    const heading = struck ? `### ~~${id} — Step ${id}~~` : `### ${id} — Step ${id}`;
    const tick = struck ? '[ ]' : mark;
    return `${heading}\n\n- **Covers:** AC-001, AC-009\n${extra}- **Do:** Do ${id} with \`code\` and a [link](x).\n- **Verify:** Verify ${id}.\n- ${tick} **Verified (${id}):** ${tick === '[x]' ? '2026-11-18 · green' : '—'}\n- **Notes:** —\n`;
}

export function generatedFiles(options: GeneratedOptions = {}): Record<string, string> {
    const closing = options.closing === undefined ? 'Parallel: stage 3 (separate files) and stage 4.\n  Second line of the closing.' : options.closing;
    const blocks = (options.steps ?? ['T-001:[x]', 'T-002:[x]', 'T-003:~~', 'T-004:[ ]', 'T-005:[ ]', 'T-006:[ ]', 'T-007:[ ]', 'T-008:[ ]', 'T-009:[ ]', 'T-010:[ ]', 'T-011:[ ]', 'T-012:[ ]', 'T-013:[ ]']).map((entry) => {
        const [id, mark] = entry.split(':');
        return stepBlock(id!, mark!, id === 'T-004' ? '- **Files:** `src/a.ts`, `src/a.test.ts`\n' : '');
    });
    const plan = `# Plan — Generated\n\n**Spec:** [0007-gen.md](0007-gen.md)\n**Status:** ${options.planStatus ?? 'In Progress'}\n**Last updated:** 2026-11-18\n**Current step:** T-004\n\n## Stages\n\n${options.stages ?? DEFAULT_STAGES}\n${closing === null ? '' : `\n${closing}\n`}\n## Steps\n\n${blocks.join('\n')}`;
    const spec = `# Generated spec\n\n**Status:** In Progress\n**Plan:** [0007-gen.plan.md](0007-gen.plan.md)\n\n## 13. Acceptance criteria\n\n**AC-001** The system shall work.\n\n**AC-009** The system shall also work.\n`;
    return { [GEN_SPEC]: spec, [GEN_PLAN]: plan };
}

export function generatedModel(options: GeneratedOptions = {}, extra: Record<string, string> = {}): Promise<ShellModel> {
    return modelOf({ ...generatedFiles(options), ...extra });
}

export function noteFile(id: string, status: string, blockedOn?: string): Record<string, string> {
    const blocked = blockedOn === undefined ? '' : `- **Blocked on:** ${blockedOn}\n`;
    return { [`.memory-bank/activeContext.0007-${id}.md`]: `# Return note — 0007 · ${id}\n\n- **Status:** ${status}\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n${blocked}` };
}

export async function modelWithUnreadable(files: Record<string, string>, unreadable: string[]): Promise<ShellModel> {
    const source = createMemorySpecSource();
    for (const [relativePath, content] of Object.entries(files)) {
        if (!unreadable.includes(relativePath)) {
            source.setFile(ROOT, relativePath, content);
        }
    }
    for (const relativePath of unreadable) {
        source.setUnreadable(ROOT, relativePath, 'EACCES: permission denied');
    }
    const project = await readProject(source, ROOT, VERSION);
    return { project, lifecycle: deriveLifecycle(project) };
}
