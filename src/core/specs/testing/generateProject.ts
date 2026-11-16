import { promises as fs } from 'fs';
import * as path from 'path';

function specText(index: number, planLink: string): string {
    const number = String(index).padStart(4, '0');
    const lines = [`# Generated spec ${number}`, '', '**Status:** In Progress', `**Plan:** ${planLink}`, '', '## 1. Summary', '', `Generated spec number ${index} for the performance fixture.`, ''];
    lines.push('## 13. Acceptance criteria', '');
    for (let criterion = 1; criterion <= 10; criterion++) {
        const id = `AC-${String(criterion).padStart(3, '0')}`;
        lines.push(`- **${id}** The system shall do thing ${criterion} of spec ${index}.`, `  > **Given** a state **When** an action **Then** a result ${criterion}.`);
    }
    lines.push('', '## 7. Functional requirements', '', '| ID | Requirement | Criteria |', '| --- | --- | --- |');
    for (let requirement = 1; requirement <= 5; requirement++) {
        lines.push(`| FR-0${requirement} | Requirement ${requirement} | AC-00${requirement} |`);
    }
    for (let section = 14; section <= 18; section++) {
        lines.push('', `## ${section}. Section ${section}`, '', 'Free text '.repeat(20));
    }
    return `${lines.join('\n')}\n`;
}

function planText(index: number, specLink: string): string {
    const number = String(index).padStart(4, '0');
    const lines = [`# Plan — Generated ${number}`, '', `**Spec:** ${specLink}`, '**Status:** In Progress', '**Last updated:** 2026-11-16', '**Current step:** T-002', '', '## Approach', '', 'Generated approach text.', '', '## Stages', '', '1. T-001 — first', '2. T-002 → T-003 — rest', '', '## Steps', ''];
    for (let step = 1; step <= 5; step++) {
        const id = `T-00${step}`;
        lines.push(`### ${id} — Step ${step}`, '', `- **Covers:** AC-00${step}`, '- **Do:** do the thing', '- **Verify:** `npm test`', `- [${step < 3 ? 'x' : ' '}] **Verified (${id}):** ${step < 3 ? '2026-11-16 · green' : '—'}`, '- **Notes:** —', '');
    }
    lines.push('## Traceability', '', '| Acceptance criterion | Steps | Code / files | Test | State |', '| --- | --- | --- | --- | --- |');
    for (let row = 1; row <= 10; row++) {
        lines.push(`| AC-${String(row).padStart(3, '0')} | T-00${(row % 5) + 1} | \`src/a.ts\` | \`a.test.ts\` | open |`);
    }
    lines.push('', '## Session handoff', '', '- **Done so far:** x', '- **Next action:** y', '- **Open decisions:** —', '- **Baseline:** abc', '- **Environment:** node', '');
    return lines.join('\n');
}

export async function generateProject(root: string, specCount: number): Promise<void> {
    const folders = ['backlog', 'active', 'done'] as const;
    for (const folder of ['backlog', 'active', 'done', 'plan-archive']) {
        await fs.mkdir(path.join(root, '.specs', folder), { recursive: true });
    }
    await fs.mkdir(path.join(root, '.memory-bank'), { recursive: true });
    const writes: Promise<void>[] = [];
    for (let index = 1; index <= specCount; index++) {
        const folder = folders[index % 3];
        const stem = `${String(index).padStart(4, '0')}-generated-spec`;
        const planName = folder === 'done' ? `${stem}.2026-11-16.plan.md` : `${stem}.plan.md`;
        const planDirectory = folder === 'done' ? 'plan-archive' : folder;
        const planLink = folder === 'done' ? `[${planName}](../plan-archive/${planName})` : `[${planName}](${planName})`;
        const specLink = folder === 'done' ? `[${stem}.md](../done/${stem}.md)` : `[${stem}.md](${stem}.md)`;
        writes.push(fs.writeFile(path.join(root, '.specs', folder, `${stem}.md`), specText(index, planLink)));
        writes.push(fs.writeFile(path.join(root, '.specs', planDirectory, planName), planText(index, specLink)));
        if (index % 20 === 0) {
            writes.push(fs.writeFile(path.join(root, '.memory-bank', `activeContext.${String(index).padStart(4, '0')}-T-001.md`), '- **Status:** DONE\n'));
        }
    }
    await Promise.all(writes);
}
