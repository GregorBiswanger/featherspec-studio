import { describe, expect, it } from 'vitest';
import type { Orchestrator, PreviousRun, StartRequest, StartResult } from '../orchestrator/orchestrator';
import { bindOrchestrator } from './orchestratorBinding';

function fakeOrchestrator(result: StartResult, previous: PreviousRun): Pick<Orchestrator, 'start' | 'previousRun'> & { requests: StartRequest[] } {
    const requests: StartRequest[] = [];
    return {
        requests,
        async start(request) {
            requests.push(request);
            return result;
        },
        async previousRun() {
            return previous;
        },
    };
}

const REQUEST = { providerId: 'fake', spec: { stem: '0001-a', path: '.specs/backlog/0001-a.md' }, prompt: 'Go.', projectRoot: 'file:///c%3A/project' };

describe('orchestrator binding', () => {
    it('maps the start request onto 0011 with "not available" for no model and the root turned into a path', async () => {
        const orchestrator = fakeOrchestrator({ kind: 'started', runId: 'run-1' }, { kind: 'none' });
        const port = bindOrchestrator(orchestrator, (root) => `path-of:${root}`);
        expect(await port.start(REQUEST)).toEqual({ kind: 'started', runId: 'run-1' });
        expect(orchestrator.requests).toEqual([
            { stem: '0001-a', path: '.specs/backlog/0001-a.md', providerId: 'fake', model: 'not available', prompt: 'Go.', workingDirectory: 'path-of:file:///c%3A/project' },
        ]);
        await port.start({ ...REQUEST, model: 'm-1' });
        expect(orchestrator.requests[1]?.model).toBe('m-1');
    });

    it('maps 0011 refusals with and without the run', async () => {
        const open = bindOrchestrator(fakeOrchestrator({ kind: 'refused', code: 'run-open', reason: 'Open.', run: { runId: 'r-7', stem: '0002-b' } }, { kind: 'none' }), (root) => root);
        expect(await open.start(REQUEST)).toEqual({ kind: 'refused', text: 'Open.', run: { runId: 'r-7', stem: '0002-b' } });
        const other = bindOrchestrator(fakeOrchestrator({ kind: 'refused', code: 'not-registered', reason: 'No.' }, { kind: 'none' }), (root) => root);
        expect(await other.start(REQUEST)).toEqual({ kind: 'refused', text: 'No.' });
    });

    it('maps the previous-run summary', async () => {
        const run = bindOrchestrator(
            fakeOrchestrator({ kind: 'started', runId: 'x' }, { kind: 'run', runId: 'r-1', status: 'Failed', errorClass: 'auth', errorText: 'Rejected.' }),
            (root) => root,
        );
        expect(await run.previousRun('0001-a')).toEqual({ kind: 'run', runId: 'r-1', status: 'Failed', errorClass: 'auth', errorText: 'Rejected.' });
        const none = bindOrchestrator(fakeOrchestrator({ kind: 'started', runId: 'x' }, { kind: 'not-available', reason: 'no store' }), (root) => root);
        expect(await none.previousRun('0001-a')).toEqual({ kind: 'not-available', reason: 'no store' });
    });
});
