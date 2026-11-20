import { describe, expect, it } from 'vitest';
import { MARKER_WATCH_PATHS } from './markerWatchPaths';

describe('0001 AC-013 as amended by 0014: the paths whose change reruns discovery', () => {
    it('are the two markers and the setup folder', () => {
        expect(MARKER_WATCH_PATHS).toEqual(['AGENTS.md', '.specs', '.featherspec-setup', '.memory-bank/projectbrief.md']);
    });

    it('0029 AC-002 the project brief is the one path 0029 adds, so a filled brief re-reads the sign', () => {
        expect(MARKER_WATCH_PATHS.slice(0, 3)).toEqual(['AGENTS.md', '.specs', '.featherspec-setup']);
        expect(MARKER_WATCH_PATHS[3]).toBe('.memory-bank/projectbrief.md');
    });

    it('negative control, a folder that is no marker is not watched', () => {
        expect(MARKER_WATCH_PATHS).not.toContain('.claude');
    });
});
