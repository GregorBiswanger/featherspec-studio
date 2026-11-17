import { describe, expect, it } from 'vitest';
import { run } from '../board/testing/boardWorld';
import { runHeader } from './header';

const spec = { stem: '0007-board', number: '0007', title: 'Spec Board', found: true };

describe('AC-005: the run header', () => {
    it('shows run ID, provider, model, session, spec, status and times, and the cause beside the status', () => {
        const header = runHeader(
            run('run-1', '0007-board', {
                model: 'gpt-x',
                sessionRef: 'session-9',
                status: 'Running',
                started: '2026-11-17T10:00:00.000Z',
                statusHistory: [
                    { status: 'Starting', at: '2026-11-17T09:59:59.000Z' },
                    { status: 'Running', at: '2026-11-17T10:00:00.000Z', cause: 'resumed from run run-0' },
                ],
            }),
            spec,
            'Copilot',
        );
        expect(header).toEqual({
            runId: 'run-1',
            provider: 'Copilot',
            model: 'gpt-x',
            session: 'session-9',
            spec,
            status: 'Running',
            cause: 'resumed from run run-0',
            started: '2026-11-17T10:00:00.000Z',
            ended: undefined,
        });
    });

    it('"not available" for every value the store does not hold; no cause when the entry has none', () => {
        const header = runHeader(run('run-2', '0007-board', { model: '', sessionRef: undefined, statusHistory: [{ status: 'Running', at: '2026-11-17T10:00:00.000Z' }] }), spec, 'fake');
        expect(header).toMatchObject({ model: 'not available', session: 'not available', cause: undefined, started: undefined });
    });

    it('the cause is the one of the newest entry of the current status', () => {
        const header = runHeader(
            run('run-3', '0007-board', {
                status: 'Interrupted',
                statusHistory: [
                    { status: 'Running', at: '2026-11-17T10:00:00.000Z', cause: 'first' },
                    { status: 'Interrupted', at: '2026-11-17T10:05:00.000Z', cause: 'extension host restarted' },
                ],
            }),
            spec,
            'fake',
        );
        expect(header.cause).toBe('extension host restarted');
    });
});
