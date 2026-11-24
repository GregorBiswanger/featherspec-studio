import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { ASSISTANTS } from './assistants';
import { attachmentOf, followUpCaseOf } from './attachment';
import { claudeText, CLI_FORMS, cliText } from './references';
import { CASE_WORLDS } from './testing/caseWorlds';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];
const PLAN = '.specs/active/0035-x.plan.md';
const SPEC = '.specs/active/0035-x.md';

describe('0035 PD-112 AC-046: cliText for both forms', () => {
    it('AC-046 CLI_FORMS is claudeCode slash, junie follow, the Copilot agent follow', () => {
        expect(CLI_FORMS).toEqual({ claudeCode: 'slash', junie: 'follow', 'copilot': 'follow' });
    });

    const TABLE: ReadonlyArray<readonly [string, readonly string[], string, string]> = [
        ['/sdd-plan .specs/active/0035-x.md', [], '/sdd-plan .specs/active/0035-x.md', 'Follow .claude/commands/sdd-plan.md for .specs/active/0035-x.md'],
        ['/sdd-plan .specs/active/0035-x.md', [SPEC], `/sdd-plan .specs/active/0035-x.md @${SPEC}`, `Follow .claude/commands/sdd-plan.md for .specs/active/0035-x.md @${SPEC}`],
        ['/sdd-plan .specs/active/0035-x.md', [SPEC, PLAN], `/sdd-plan .specs/active/0035-x.md @${SPEC} @${PLAN}`, `Follow .claude/commands/sdd-plan.md for .specs/active/0035-x.md @${SPEC} @${PLAN}`],
        ['/sdd-specify', [], '/sdd-specify', 'Follow .claude/commands/sdd-specify.md'],
        ['/sdd-specify', [SPEC], `/sdd-specify @${SPEC}`, `Follow .claude/commands/sdd-specify.md @${SPEC}`],
        [`Implement T-003 of ${PLAN}`, [], `Implement T-003 of ${PLAN}`, `Implement T-003 of ${PLAN}`],
        [`Implement T-003 of ${PLAN}`, [SPEC, PLAN], `Implement T-003 of ${PLAN} @${SPEC} @${PLAN}`, `Implement T-003 of ${PLAN} @${SPEC} @${PLAN}`],
        ['Continue with the next step', [PLAN], `Continue with the next step @${PLAN}`, `Continue with the next step @${PLAN}`],
        ['Explain /sdd-plan please', [], 'Explain /sdd-plan please', 'Explain /sdd-plan please'],
    ];

    for (const [line, paths, slash, follow] of TABLE) {
        it(`AC-046 ${JSON.stringify(line)} with ${paths.length} path(s)`, () => {
            expect(cliText(line, paths, 'slash')).toBe(slash);
            expect(cliText(line, paths, 'follow')).toBe(follow);
        });
    }

    it('AC-046 the name keeps its characters and a rest with spaces stays whole', () => {
        expect(cliText('/sdd-architecture-update now and then', [], 'follow')).toBe('Follow .claude/commands/sdd-architecture-update.md for now and then');
    });

    it('AC-046 a path with whitespace, a tab or a line break is in no text; the line still names it', () => {
        const line = '/sdd-plan .specs/active/a b.md';
        expect(cliText(line, ['.specs/active/a b.md', PLAN, 'x\ty.md', 'x\ny.md'], 'slash')).toBe(`${line} @${PLAN}`);
        expect(cliText(line, ['.specs/active/a b.md'], 'follow')).toBe('Follow .claude/commands/sdd-plan.md for .specs/active/a b.md');
    });

    it('AC-046 claudeText stays the slash form of cliText', () => {
        expect(claudeText('/sdd-plan x', [SPEC, PLAN])).toBe(cliText('/sdd-plan x', [SPEC, PLAN], 'slash'));
        expect(claudeText('/sdd-plan x', [SPEC, PLAN])).toBe(`/sdd-plan x @${SPEC} @${PLAN}`);
    });
});

describe('0035 PD-112 AC-046: the path lists equal the mentions of VS Code Claude Code Send', () => {
    const offer = { assistant: 'claudeCode', attaches: true } as const;

    function pathsOf(stepCase: StepCase, key: string): string[] {
        const decision = attachmentOf(offer, stepCase, { key, plan: key.replace(/\.md$/, '.plan.md') });
        return [decision.attach, ...(decision.attachAlso ?? [])].flatMap((file) => (file === undefined ? [] : [file.path]));
    }

    function mentionsOf(line: string, paths: readonly string[]): string[] {
        const call = ASSISTANTS.claudeCode.callsFor('new', line, paths.map((path) => ({ uri: path, path })))[0]!;
        return (String(call.args[1]).slice(line.length).match(/ @(\S+)/g) ?? []).map((mention) => mention.slice(2));
    }

    for (const stepCase of CASES) {
        it(`AC-046 ${stepCase}: first line and follow-up line, for the three agents`, () => {
            const { key } = CASE_WORLDS[stepCase];
            const followCase = followUpCaseOf(stepCase, 1);
            const lines: Array<[string, StepCase]> = [[`/sdd-x ${key}`, stepCase], ...(followCase === undefined ? [] : [[`/sdd-y ${key}`, followCase] as [string, StepCase]])];
            for (const [line, lineCase] of lines) {
                const paths = pathsOf(lineCase, key);
                const mentions = mentionsOf(line, paths);
                expect(mentions).toEqual(paths);
                for (const agent of ['junie', 'claudeCode', 'copilot'] as const) {
                    const text = cliText(line, paths, CLI_FORMS[agent]);
                    expect(text.split(' @').slice(1)).toEqual(mentions);
                }
                expect(claudeText(line, paths)).toBe(`${line}${mentions.map((path) => ` @${path}`).join('')}`);
            }
        });
    }

    it('AC-046 the welcome and the empty state type no path', () => {
        for (const form of ['slash', 'follow'] as const) {
            expect(cliText('/sdd-setup', [], form)).not.toContain('@');
            expect(cliText('/sdd-specify', [], form)).not.toContain('@');
        }
    });

    it('AC-046 negative control: one path swapped is caught', () => {
        const paths = pathsOf('NS-7-start', CASE_WORLDS['NS-7-start'].key);
        expect(paths).toHaveLength(2);
        const swapped = [paths[1]!, paths[0]!];
        expect(mentionsOf('/sdd-x', swapped)).not.toEqual(paths);
        expect(cliText('/sdd-x', swapped, 'slash')).not.toBe(cliText('/sdd-x', paths, 'slash'));
    });
});
