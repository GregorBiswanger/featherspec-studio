import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { readMemory } from '../../lifecycle/testing/projects';
import type { ShellModel } from '../../ports/shell';

export type SpecKind = 'Backlog' | 'Ready' | 'Active' | 'Review' | 'Done' | 'Deprecated' | 'DoneOther' | 'Blocked' | 'Contradicted' | 'Unknown';

export interface SpecInput {
    number: string;
    slug?: string;
    kind: SpecKind;
    title?: string | null;
}

export function stemOf(input: SpecInput): string {
    return `${input.number}-${input.slug ?? 'thing'}`;
}

function specFile(input: SpecInput, status: string, plan: string, extra = '', header = ''): string {
    const lines = input.title === null ? [] : [`# ${input.title ?? `Thing ${input.number}`}`, ''];
    lines.push(`**Status:** ${status}`, `**Plan:** ${plan}`);
    if (header !== '') {
        lines.push(header);
    }
    lines.push('');
    if (extra !== '') {
        lines.push(extra, '');
    }
    lines.push('## 14. Acceptance criteria', '', '- **AC-001** The system shall work.', '');
    return lines.join('\n');
}

function planFile(stem: string, status: string, folder: string): string {
    return ['# Plan', '', `**Spec:** [${stem}.md](${stem}.md)`, `**Status:** ${status}`, ''].join('\n') + `\n(${folder})\n`;
}

export function filesFor(inputs: readonly SpecInput[]): Record<string, string> {
    const files: Record<string, string> = {};
    for (const input of inputs) {
        const stem = stemOf(input);
        const link = `[${stem}.plan.md](${stem}.plan.md)`;
        const archive = `[${stem}.2026-11-16.plan.md](../plan-archive/${stem}.2026-11-16.plan.md)`;
        switch (input.kind) {
            case 'Backlog':
                files[`.specs/backlog/${stem}.md`] = specFile(input, 'Draft', '_none yet_');
                break;
            case 'Ready':
                files[`.specs/backlog/${stem}.md`] = specFile(input, 'Draft', link);
                files[`.specs/backlog/${stem}.plan.md`] = planFile(stem, 'Not started', 'backlog');
                break;
            case 'Active':
                files[`.specs/active/${stem}.md`] = specFile(input, 'In Progress', link);
                files[`.specs/active/${stem}.plan.md`] = planFile(stem, 'In Progress', 'active');
                break;
            case 'Review':
                files[`.specs/active/${stem}.md`] = specFile(input, 'In Progress', link);
                files[`.specs/active/${stem}.plan.md`] = planFile(stem, 'Done', 'active');
                break;
            case 'Blocked':
                files[`.specs/active/${stem}.md`] = specFile(input, 'In Progress', link);
                files[`.specs/active/${stem}.plan.md`] = planFile(stem, 'Blocked', 'active');
                break;
            case 'Done':
                files[`.specs/done/${stem}.md`] = specFile(input, 'Implemented', archive);
                files[`.specs/plan-archive/${stem}.2026-11-16.plan.md`] = planFile(stem, 'Done', 'archive');
                break;
            case 'Deprecated':
                files[`.specs/done/${stem}.md`] = specFile(input, 'Deprecated', archive, '**Successor:** none — behaviour removed');
                files[`.specs/plan-archive/${stem}.2026-11-16.plan.md`] = planFile(stem, 'Done', 'archive');
                break;
            case 'DoneOther':
                files[`.specs/done/${stem}.md`] = specFile(input, 'In Progress', archive);
                files[`.specs/plan-archive/${stem}.2026-11-16.plan.md`] = planFile(stem, 'Done', 'archive');
                break;
            case 'Contradicted':
                files[`.specs/active/${stem}.md`] = specFile(input, 'Draft', link);
                files[`.specs/active/${stem}.plan.md`] = planFile(stem, 'In Progress', 'active');
                break;
            case 'Unknown':
                files[`.specs/backlog/${stem}.md`] = specFile(input, 'Draft', '_none yet_', '', '**Mystery:** value');
                break;
        }
    }
    return files;
}

export async function modelFor(inputs: readonly SpecInput[], extraFiles: Record<string, string> = {}): Promise<ShellModel> {
    const project = await readMemory({ ...filesFor(inputs), ...extraFiles });
    return { project, lifecycle: deriveLifecycle(project) };
}

export const AC001_FIXTURE: SpecInput[] = [
    { number: '0001', kind: 'Backlog' },
    { number: '0002', kind: 'Backlog' },
    { number: '0003', kind: 'Ready' },
    { number: '0004', kind: 'Active' },
    { number: '0005', kind: 'Review' },
    { number: '0006', kind: 'Done' },
    { number: '0007', kind: 'Done' },
    { number: '0008', kind: 'Deprecated' },
    { number: '0009', kind: 'Blocked' },
];
