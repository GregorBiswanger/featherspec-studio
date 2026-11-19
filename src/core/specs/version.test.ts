import { describe, expect, it } from 'vitest';
import { checkVersion, compareVersions, levelsOnImplement, parseSemanticVersion } from './version';

describe('checkVersion', () => {
    it.each(['1.7.0', '1.8.0', '1.9.3', '1.10.0', '1.8.0-rc3', '1.10.0-rc1', '1.10.0+build.5', '1.7.0+x'])(
        'AC-016: %s is inside 1.7.0 to 1.10.0 and gets no diagnostic',
        (version) => {
            expect(checkVersion(version)).toBeUndefined();
        },
    );

    it.each(['unknown', '', 'abc', '1.8', '1.x.0', 'v1.8.0', '01.8.0', '1.8.0-', '1.8.0-01', '1.6.9', '1.7.0-rc1', '0.9.0'])(
        'AC-016: %j is not verified (unknown, not comparable or older than 1.7.0)',
        (version) => {
            expect(checkVersion(version)).toEqual({ kind: 'unverified-version', tier: 'note', scope: 'project', reason: 'version not verified' });
        },
    );

    it.each(['1.10.1', '1.11.0', '2.0.0', '1.10.1-rc1', '10.0.0'])('AC-016: %s is newer than known', (version) => {
        expect(checkVersion(version)).toEqual({ kind: 'unverified-version', tier: 'note', scope: 'project', reason: 'newer than known' });
    });
});

describe('compareVersions', () => {
    function order(left: string, right: string): number {
        const a = parseSemanticVersion(left);
        const b = parseSemanticVersion(right);
        if (a === undefined || b === undefined) {
            throw new Error('not parsable');
        }
        return Math.sign(compareVersions(a, b));
    }

    it('AC-016: compares numerically, not as text', () => {
        expect(order('1.10.0', '1.9.0')).toBe(1);
        expect(order('1.2.0', '1.10.0')).toBe(-1);
    });

    it('AC-016: a pre-release is lower than its release and pre-releases follow semver §11', () => {
        expect(order('1.8.0-rc3', '1.8.0')).toBe(-1);
        expect(order('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
        expect(order('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBe(-1);
        expect(order('1.0.0-alpha.beta', '1.0.0-beta')).toBe(-1);
        expect(order('1.0.0-rc.2', '1.0.0-rc.11')).toBe(-1);
        expect(order('1.0.0-1', '1.0.0-alpha')).toBe(-1);
    });

    it('AC-016: build metadata is ignored', () => {
        expect(order('1.0.0+a', '1.0.0+b')).toBe(0);
    });
});

describe('0028 AC-009: levelsOnImplement', () => {
    it.each(['1.11.0', '1.11.1', '1.12.0', '2.0.0', '1.11.0+build.5'])('%s levels the plan on Implement', (version) => {
        expect(levelsOnImplement(version)).toBe(true);
    });

    it.each(['1.7.0', '1.10.0', '1.10.9', '1.11.0-rc.1', 'next', 'unknown', '', '1.11', 'v1.11.0'])('%s does not (old, pre-release, unknown or not a version)', (version) => {
        expect(levelsOnImplement(version)).toBe(false);
    });
});
