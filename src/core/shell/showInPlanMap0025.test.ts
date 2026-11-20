import { describe, expect, it } from 'vitest';
import { planText, specText } from '../lifecycle/testing/projects';
import type { NavigationRequest } from '../../shared/protocol/messages';
import { modelOf } from '../board/testing/boardWorld';
import { modelWithUnreadable } from '../planMap/testing/plans';
import type { ShellModel } from '../ports/shell';
import { createTreeActions } from './treeActions';
import { buildSpecTree, type GroupModel, type SpecRowModel } from './specTree';

const ACTIVE = '.specs/active/0007-x.md';
const ACTIVE_PLAN = '.specs/active/0007-x.plan.md';
const READY = '.specs/backlog/0008-y.md';
const READY_PLAN = '.specs/backlog/0008-y.plan.md';
const NOPLAN = '.specs/backlog/0010-n.md';
const DONE = '.specs/done/0009-z.md';

function plan(steps: Array<[string, string]>, status = 'In Progress'): string {
    return `${planText({ status })}\n## Steps\n\n${steps.map(([id, mark]) => `### ${id} — Step\n\n- ${mark} **Verified (${id}):** —\n`).join('\n')}`;
}

async function world(extra: Record<string, string> = {}): Promise<ShellModel> {
    return modelOf({
        [ACTIVE]: specText({ status: 'In Progress', plan: '[0007-x.plan.md](0007-x.plan.md)' }),
        [ACTIVE_PLAN]: plan([['T-001', '[x]'], ['T-002', '[ ]']]),
        [READY]: specText({ plan: '[0008-y.plan.md](0008-y.plan.md)' }),
        [READY_PLAN]: plan([['T-001', '[x]']], 'Not started'),
        [NOPLAN]: specText(),
        [DONE]: specText({ status: 'Implemented' }),
        ...extra,
    });
}

function rowsOf(model: ShellModel): SpecRowModel[] {
    return buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model })
        .items.filter((item): item is GroupModel => item.kind === 'group')
        .flatMap((group) => group.children);
}

function rowFor(rows: SpecRowModel[], stem: string): SpecRowModel {
    return rows.find((row) => row.stem === stem)!;
}

interface Calls {
    log: string[];
    navigated: NavigationRequest[];
    open: boolean;
    shown: Array<{ preserveFocus?: boolean } | undefined>;
}

function fakes(open: boolean): { actions: ReturnType<typeof createTreeActions>; calls: Calls } {
    const calls: Calls = { log: [], navigated: [], open, shown: [] };
    const actions = createTreeActions({
        shell: {
            open: () => void calls.log.push('open'),
            select: () => void calls.log.push('select'),
            navigate: (request) => {
                calls.log.push('navigate');
                calls.navigated.push(request);
            },
        },
        panel: {
            isOpen: () => calls.open,
            show: (options) => {
                calls.log.push('show');
                calls.shown.push(options);
            },
        },
        copy: async () => undefined,
        openFile: { open: async () => ({ kind: 'opened' as const }) } as never,
        warn: () => undefined,
    });
    return { actions, calls };
}

describe('0025 AC-005: a row names map exactly when its spec is map-able', () => {
    it('0025 AC-005: the context value table', async () => {
        const rows = rowsOf(await world());
        expect(rowFor(rows, '0007-x').contextValue.split(' ')).toContain('map');
        expect(rowFor(rows, '0008-y').contextValue.split(' ')).toContain('map');
        expect(rowFor(rows, '0010-n').contextValue.split(' ')).not.toContain('map');
        expect(rowFor(rows, '0009-z').contextValue.split(' ')).not.toContain('map');
    });

    it('0025 AC-005: a plan Studio cannot read is not map-able', async () => {
        const files = { [ACTIVE]: specText({ status: 'In Progress', plan: '[0007-x.plan.md](0007-x.plan.md)' }), [ACTIVE_PLAN]: plan([['T-001', '[ ]']]) };
        const rows = rowsOf(await modelWithUnreadable(files, [ACTIVE_PLAN]));
        expect(rowFor(rows, '0007-x').contextValue.split(' ')).not.toContain('map');
        expect(rowFor(rows, '0007-x').mapStep).toBeUndefined();
    });

    it('0025 AC-005: the row carries the first plan step its next step names', async () => {
        const rows = rowsOf(await world());
        expect(rowFor(rows, '0007-x').mapStep).toBe('T-002');
        expect(rowFor(rows, '0008-y').mapStep).toBeUndefined();
        expect(rowFor(rows, '0010-n').mapStep).toBeUndefined();
    });
});

describe('0025 AC-005: Show in Plan Map opens a closed panel, sends the step target and reveals the panel with focus', () => {
    it('0025 AC-005: closed panel - open, navigate with the step, then show without preserveFocus', async () => {
        const { actions, calls } = fakes(false);
        const row = rowFor(rowsOf(await world()), '0007-x');
        actions.showInPlanMap(row);
        expect(calls.log).toEqual(['open', 'navigate', 'show']);
        expect(calls.navigated).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0007-x', step: 'T-002' } }]);
        expect(calls.shown).toEqual([{ preserveFocus: false }]);
    });

    it('0025 AC-005: an open panel is not opened again; a duplicate stem carries its path', () => {
        const { actions, calls } = fakes(true);
        actions.showInPlanMap({ stem: '0007-x', path: '.specs/active/0007-x.md', mapStep: 'T-002' });
        expect(calls.log).toEqual(['navigate', 'show']);
        expect(calls.navigated[0]).toEqual({ area: 'planMap', target: { kind: 'spec', stem: '0007-x', path: '.specs/active/0007-x.md', step: 'T-002' } });
    });

    it('0025 AC-005: no step named - the spec alone, focus on the map\'s heading', () => {
        const { actions, calls } = fakes(true);
        actions.showInPlanMap({ stem: '0008-y' });
        expect(calls.navigated).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0008-y', heading: true } }]);
        expect(calls.shown).toEqual([{ preserveFocus: false }]);
    });
});
