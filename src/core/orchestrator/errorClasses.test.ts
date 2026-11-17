import { describe, expect, it } from 'vitest';
import { ERROR_CATEGORIES } from '../providers/vocabulary';
import { ERROR_CLASSES, classOf } from './errorClasses';

describe('error classes', () => {
    it('AC-007: the closed list has the nine classes of BR-008', () => {
        expect([...ERROR_CLASSES]).toEqual([
            'auth',
            'quota_or_rate_limit',
            'model_unavailable',
            'network_or_server',
            'runtime_missing',
            'policy_denied',
            'provider_exited',
            'start_timeout',
            'unknown',
        ]);
    });

    it('AC-007: a category that bears the name of a class gets that class', () => {
        for (const category of ['auth', 'quota_or_rate_limit', 'model_unavailable', 'network_or_server', 'runtime_missing', 'policy_denied']) {
            expect(classOf({ source: 'provider', category })).toBe(category);
        }
    });

    it('AC-007: any other category is unknown, including the ones no class carries', () => {
        for (const category of ['cancelled', 'tool_failure', 'unknown', 'start_timeout', 'provider_exited', 'nonsense', 5, undefined]) {
            expect(classOf({ source: 'provider', category })).toBe('unknown');
        }
    });

    it('AC-007: a derived failure is provider_exited whatever its category says', () => {
        for (const category of ERROR_CATEGORIES) {
            expect(classOf({ source: 'derived', category })).toBe('provider_exited');
        }
    });
});
