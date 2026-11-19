import { describe, expect, it } from 'vitest';
import { MARKER_WATCH_PATHS } from './markerWatchPaths';

describe('0001 AC-013 as amended by 0014: the paths whose change reruns discovery', () => {
    it('are the two markers, the setup folder and, as 0029 AC-002 adds, the project brief', () => {
        expect(MARKER_WATCH_PATHS).toEqual(['AGENTS.md', '.specs', '.featherspec-setup', '.memory-bank/projectbrief.md']);
    });

    it('negative control, a folder that is no marker is not watched', () => {
        expect(MARKER_WATCH_PATHS).not.toContain('.claude');
    });
});
