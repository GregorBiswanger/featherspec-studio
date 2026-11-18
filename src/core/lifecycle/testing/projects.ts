import { createNodeSpecSource } from '../../../adapters/node/nodeSpecSource';
import { fixturePath } from '../../discovery/testing/fixtures';
import { createMemorySpecSource } from '../../specs/testing/memorySpecSource';
import { readProject } from '../../specs/readProject';
import type { ProjectRead } from '../../specs/readProject';

export const ROOT = 'memory://lifecycle';
export const VERSION = '1.10.0';

export async function readFixture(name: string): Promise<ProjectRead> {
    return readProject(createNodeSpecSource(), fixturePath(name), VERSION);
}

export async function readMemory(files: Record<string, string>): Promise<ProjectRead> {
    const source = createMemorySpecSource();
    for (const [relativePath, content] of Object.entries(files)) {
        source.setFile(ROOT, relativePath, content);
    }
    return readProject(source, ROOT, VERSION);
}

export interface SpecOptions {
    status?: string | undefined;
    plan?: string | undefined;
    origin?: string;
    criteria?: boolean;
    extraHeader?: string;
}

export function specText(options: SpecOptions = {}): string {
    const lines = ['# Spec', ''];
    const status = 'status' in options ? options.status : 'Draft';
    if (status !== undefined) {
        lines.push(`**Status:** ${status}`);
    }
    if (options.plan !== undefined) {
        lines.push(`**Plan:** ${options.plan}`);
    }
    if (options.origin !== undefined) {
        lines.push(`**Origin:** ${options.origin}`);
    }
    if (options.extraHeader !== undefined) {
        lines.push(options.extraHeader);
    }
    lines.push('', '## 13. Acceptance criteria', '');
    if (options.criteria !== false) {
        lines.push('**AC-001** The system shall work.', '');
    }
    return `${lines.join('\n')}\n`;
}

export interface PlanOptions {
    status?: string;
    rows?: string[];
    spec?: string;
    lastUpdated?: string;
}

export function planText(options: PlanOptions = {}): string {
    const lines = ['# Plan', '', `**Spec:** ${options.spec ?? '—'}`, `**Status:** ${options.status ?? 'Not started'}`, ...(options.lastUpdated === undefined ? [] : [`**Last updated:** ${options.lastUpdated}`]), ''];
    if (options.rows !== undefined) {
        lines.push(
            '## Traceability',
            '',
            '| Acceptance criterion | Steps | Code / files | Test | State |',
            '| --- | --- | --- | --- | --- |',
            ...options.rows,
            '',
        );
    }
    return `${lines.join('\n')}\n`;
}

export function row(criterion: string, state: string): string {
    return `| ${criterion} | T-001 | — | — | ${state} |`;
}

export function noteText(status: string): string {
    return `# Return note\n\n- **Status:** ${status}\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n`;
}
