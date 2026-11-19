import type { Diagnostic } from './diagnostics';

export const OLDEST_KNOWN = '1.7.0';
export const NEWEST_KNOWN = '1.11.0';

export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease: string[];
}

const IDENTIFIER = '(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)';
const SEMVER = new RegExp(
    `^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-(${IDENTIFIER}(?:\\.${IDENTIFIER})*))?(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?$`,
);
const NUMERIC = /^\d+$/;

export function parseSemanticVersion(raw: string): SemanticVersion | undefined {
    const match = SEMVER.exec(raw);
    if (match === null) {
        return undefined;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] === undefined ? [] : match[4].split('.'),
    };
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
    if (left.length === 0 || right.length === 0) {
        return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
    }
    for (let index = 0; index < Math.min(left.length, right.length); index++) {
        const a = left[index];
        const b = right[index];
        const aNumeric = NUMERIC.test(a);
        const bNumeric = NUMERIC.test(b);
        if (aNumeric && bNumeric) {
            if (Number(a) !== Number(b)) {
                return Number(a) < Number(b) ? -1 : 1;
            }
        } else if (aNumeric !== bNumeric) {
            return aNumeric ? -1 : 1;
        } else if (a !== b) {
            return a < b ? -1 : 1;
        }
    }
    return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

export function compareVersions(left: SemanticVersion, right: SemanticVersion): number {
    for (const field of ['major', 'minor', 'patch'] as const) {
        if (left[field] !== right[field]) {
            return left[field] < right[field] ? -1 : 1;
        }
    }
    return comparePrerelease(left.prerelease, right.prerelease);
}

const OLDEST = parseSemanticVersion(OLDEST_KNOWN);
const NEWEST = parseSemanticVersion(NEWEST_KNOWN);

export function checkVersion(version: string): Diagnostic | undefined {
    const parsed = parseSemanticVersion(version);
    if (parsed === undefined || OLDEST === undefined || NEWEST === undefined || compareVersions(parsed, OLDEST) < 0) {
        return { kind: 'unverified-version', tier: 'note', scope: 'project', reason: 'version not verified' };
    }
    if (compareVersions(parsed, NEWEST) > 0) {
        return { kind: 'unverified-version', tier: 'note', scope: 'project', reason: 'newer than known' };
    }
    return undefined;
}

export const LEVELLING_SINCE = '1.11.0';

const LEVELLING = parseSemanticVersion(LEVELLING_SINCE);

export function levelsOnImplement(version: string): boolean {
    const parsed = parseSemanticVersion(version);
    return parsed !== undefined && LEVELLING !== undefined && compareVersions(parsed, LEVELLING) >= 0;
}

export const ATTACH_FROM_VERSION = '1.11.0';

const ATTACHING = parseSemanticVersion(ATTACH_FROM_VERSION);

export function attachesFrom(version: string): boolean {
    const parsed = parseSemanticVersion(version);
    return parsed !== undefined && ATTACHING !== undefined && compareVersions(parsed, ATTACHING) >= 0;
}
