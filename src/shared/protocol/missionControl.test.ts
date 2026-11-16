import { describe, expect, it } from 'vitest';
import { isMissionControlEventPayload } from './messages';
import { isMissionControlView } from './missionControl';
import { sampleView } from './testing/missionControlSample';

describe('Mission Control view contract', () => {
    it('AC-026: a built view is accepted, the unavailable forms too', () => {
        const view = sampleView();
        expect(isMissionControlView(view)).toBe(true);
        expect(isMissionControlView({ ...view, runs: { available: false, reason: 'no store' }, activity: { available: false, reason: 'no store' } })).toBe(true);
        expect(isMissionControlView({ ...view, specs: { kind: 'empty' } })).toBe(true);
    });

    it('AC-026: a view with an extra key anywhere is refused, so no run error text can reach the DOM', () => {
        const view = sampleView();
        expect(isMissionControlView({ ...view, extra: 1 })).toBe(false);
        expect(isMissionControlView({ ...view, header: { ...view.header, errorMessage: 'SECRET-1' } })).toBe(false);
        const run = (view.runs as { highlighted: unknown[] }).highlighted[0] as object;
        expect(isMissionControlView({ ...view, runs: { ...view.runs, highlighted: [{ ...run, errorMessage: 'SECRET-1' }] } })).toBe(false);
    });

    it('a view with a wrong type or an unknown word is refused', () => {
        const view = sampleView();
        expect(isMissionControlView(null)).toBe(false);
        expect(isMissionControlView({ ...view, header: { ...view.header, projectDiagnostics: '1' } })).toBe(false);
        expect(isMissionControlView({ ...view, attention: { ...view.attention, rows: [{ spec: view.attention.rows[0]?.spec, reasons: ['Made up'] }] } })).toBe(false);
        expect(isMissionControlView({ ...view, specs: { kind: 'counts', total: 1, states: [{ state: 'Nope', count: 1 }], progress: { kind: 'not available' } } })).toBe(false);
        expect(isMissionControlView({ ...view, runs: { available: true, running: -1, highlighted: [], unreadable: 0 } })).toBe(false);
    });
});

describe('Mission Control event payload', () => {
    it('accepts a payload that holds a valid view and refuses anything else (negative control: a board view is no Mission Control view)', () => {
        expect(isMissionControlEventPayload({ view: sampleView() })).toBe(true);
        expect(isMissionControlEventPayload({ view: { columns: [] } })).toBe(false);
        expect(isMissionControlEventPayload(undefined)).toBe(false);
        expect(isMissionControlEventPayload({})).toBe(false);
    });
});
