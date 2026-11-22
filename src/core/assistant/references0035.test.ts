import { describe, expect, it } from 'vitest';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { ASSISTANTS } from './assistants';
import { attachmentOf, followUpCaseOf } from './attachment';
import { claudeText, copilotCopyText, JUNIE_FORM, junieCopyText } from './references';
import { CASE_WORLDS } from './testing/caseWorlds';

const CASES = Object.keys(STEP_GUIDES) as StepCase[];
const PLAN = '.specs/active/0035-x.plan.md';
const SPEC = '.specs/active/0035-x.md';

const LINES = ['/sdd-plan .specs/active/0035-x.md', '/sdd-specify', `Implement T-003 of ${PLAN}`, 'Continue with the next step'];
const PATHS: readonly (readonly string[])[] = [[], [SPEC], [SPEC, PLAN]];

describe('0035 AC-018: junieCopyText for both forms, and the configured form', () => {
    it('0035 AC-018 the configured form is A (slash)', () => {
        expect(JUNIE_FORM).toBe('slash');
    });

    const slash = (line: string, paths: readonly string[]) => `${line}${paths.map((path) => ` @file:${path}`).join('')}`;
    const follow = (line: string): string => ({
        '/sdd-plan .specs/active/0035-x.md': 'Follow .claude/commands/sdd-plan.md for .specs/active/0035-x.md',
        '/sdd-specify': 'Follow .claude/commands/sdd-specify.md',
    })[line] ?? line;

    for (const line of LINES) {
        for (const paths of PATHS) {
            it(`0035 AC-018 form A: "${line}" with ${paths.length} path(s)`, () => {
                expect(junieCopyText(line, paths, 'slash')).toBe(slash(line, paths));
            });
            it(`0035 AC-018 form C: "${line}" with ${paths.length} path(s)`, () => {
                expect(junieCopyText(line, paths, 'follow')).toBe(slash(follow(line), paths));
            });
        }
    }

    it('0035 AC-018 form C: the name keeps its characters and a rest with spaces stays whole', () => {
        expect(junieCopyText('/sdd-lifecycle .specs/a.md In Progress', [], 'follow')).toBe('Follow .claude/commands/sdd-lifecycle.md for .specs/a.md In Progress');
        expect(junieCopyText('/sdd-plan', [], 'follow')).toBe('Follow .claude/commands/sdd-plan.md');
    });

    it('0035 AC-018 form C: a line that merely contains /sdd- stays', () => {
        expect(junieCopyText('Run /sdd-plan now', [], 'follow')).toBe('Run /sdd-plan now');
    });
});

describe('0035 AC-016, AC-017, AC-021: reference texts', () => {
    it('Claude Code: line + " @<path>" per path, in order', () => {
        expect(claudeText('/sdd-plan x', [SPEC, PLAN])).toBe(`/sdd-plan x @${SPEC} @${PLAN}`);
        expect(claudeText('/sdd-specify', [])).toBe('/sdd-specify');
    });

    it('Copilot: line + " #file:<path>" per path, in order', () => {
        expect(copilotCopyText('/sdd-plan x', [SPEC, PLAN])).toBe(`/sdd-plan x #file:${SPEC} #file:${PLAN}`);
        expect(copilotCopyText('/sdd-specify', [])).toBe('/sdd-specify');
    });

    it('a path with whitespace is in none of the three texts, the line still names it', () => {
        const paths = ['.specs/active/a b.md', PLAN];
        const line = '/sdd-plan .specs/active/a b.md';
        expect(claudeText(line, paths)).toBe(`${line} @${PLAN}`);
        expect(copilotCopyText(line, paths)).toBe(`${line} #file:${PLAN}`);
        expect(junieCopyText(line, paths, 'slash')).toBe(`${line} @file:${PLAN}`);
        expect(junieCopyText(line, paths, 'follow')).toBe(`Follow .claude/commands/sdd-plan.md for .specs/active/a b.md @file:${PLAN}`);
    });

    it('a tab or a line break in a path counts as whitespace', () => {
        expect(claudeText('x', ['a\tb.md', 'a\nb.md', 'ok.md'])).toBe('x @ok.md');
    });
});

describe('0035 AC-009: the path lists equal the mentions of VS Code Claude Code Send', () => {
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
        it(`0035 AC-009 ${stepCase}: first line and follow-up line`, () => {
            const { key } = CASE_WORLDS[stepCase];
            const followCase = followUpCaseOf(stepCase, 1);
            const lines: Array<[string, StepCase]> = [[`/sdd-x ${key}`, stepCase], ...(followCase === undefined ? [] : [[`/sdd-y ${key}`, followCase] as [string, StepCase]])];
            for (const [line, lineCase] of lines) {
                const paths = pathsOf(lineCase, key);
                const mentions = mentionsOf(line, paths);
                expect(mentions).toEqual(paths);
                expect(claudeText(line, paths)).toBe(`${line}${mentions.map((path) => ` @${path}`).join('')}`);
                expect(copilotCopyText(line, paths).split(' #file:').slice(1)).toEqual(mentions);
                expect(junieCopyText(line, paths, JUNIE_FORM).split(' @file:').slice(1)).toEqual(mentions);
            }
        });
    }

    it('0035 AC-009 the welcome and the empty state reference no path', () => {
        expect(claudeText('/sdd-setup', [])).toBe('/sdd-setup');
        expect(copilotCopyText('/sdd-specify', [])).toBe('/sdd-specify');
        expect(junieCopyText('/sdd-specify', [], 'slash')).toBe('/sdd-specify');
    });

    it('0035 AC-009 negative control: one path swapped is caught', () => {
        const paths = pathsOf('NS-7-start', CASE_WORLDS['NS-7-start'].key);
        expect(paths).toHaveLength(2);
        const swapped = [paths[1]!, paths[0]!];
        expect(mentionsOf('/sdd-x', swapped)).not.toEqual(paths);
        expect(claudeText('/sdd-x', swapped)).not.toBe(claudeText('/sdd-x', paths));
    });

    it('0035 AC-009 a path with whitespace is in no list', () => {
        const spaced = '.specs/active/a b.md';
        expect(mentionsOf('/sdd-x', [spaced, PLAN])).toEqual([PLAN]);
        expect(claudeText('/sdd-x', [spaced, PLAN])).not.toContain(`@${spaced}`);
        expect(copilotCopyText('/sdd-x', [spaced])).toBe('/sdd-x');
        expect(junieCopyText('/sdd-x', [spaced], 'slash')).toBe('/sdd-x');
    });
});
