import { describe, expect, it } from 'vitest';
import { readVersionLine } from './versionLine';

describe('readVersionLine', () => {
    it('AC-021: takes the first token and ignores a trailing comment', () => {
        const result = readVersionLine('# Settings\n\nFeatherSpecVersion: 1.10.0 # managed by /sdd-featherspec-update\n');
        expect(result).toEqual({ version: '1.10.0', diagnostics: [] });
    });

    it('AC-021: finds the line wherever it stands in the file, also indented and with CRLF', () => {
        const result = readVersionLine('a\r\nb\r\n  FeatherSpecVersion: 1.2.3\r\nc\r\n');
        expect(result).toEqual({ version: '1.2.3', diagnostics: [] });
    });

    it('AC-021: an empty value gives "unknown" plus a diagnostic', () => {
        const result = readVersionLine('FeatherSpecVersion:\n');
        expect(result.version).toBe('unknown');
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0]).toContain('no value');
    });

    it('AC-021: a value that is only a comment counts as empty', () => {
        const result = readVersionLine('FeatherSpecVersion: # nothing yet\n');
        expect(result.version).toBe('unknown');
        expect(result.diagnostics).toHaveLength(1);
    });

    it('AC-021: a second version line is ignored and diagnosed, the first wins', () => {
        const result = readVersionLine('FeatherSpecVersion: 1.10.0\nx\nFeatherSpecVersion: 1.2.0\n');
        expect(result.version).toBe('1.10.0');
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0]).toContain('line 3');
    });

    it('AC-021: a value that is not a semantic version is kept as written and named in a diagnostic', () => {
        const result = readVersionLine('FeatherSpecVersion: latest\n');
        expect(result.version).toBe('latest');
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0]).toContain('"latest"');
    });

    it('AC-021: negative control, semantic versions with pre-release and build parts raise no diagnostic', () => {
        expect(readVersionLine('FeatherSpecVersion: 2.0.0-rc.1+build.5\n').diagnostics).toEqual([]);
    });

    it('AC-021: no version line gives "unknown" without a diagnostic', () => {
        expect(readVersionLine('# Constitution\nmentions FeatherSpecVersion: in prose\n')).toEqual({
            version: 'unknown',
            diagnostics: [],
        });
    });
});
