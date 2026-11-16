import { describe, expect, it } from 'vitest';
import { sameRootFor } from './sameRoot';

describe('sameRootFor', () => {
    it('AC-012: on Windows root URIs differing only in case are the same folder', () => {
        expect(sameRootFor('win32')('file:///c%3A/Work/App', 'file:///c%3A/work/app')).toBe(true);
    });

    it('AC-012: elsewhere the comparison is case-sensitive', () => {
        expect(sameRootFor('linux')('file:///work/App', 'file:///work/app')).toBe(false);
        expect(sameRootFor('darwin')('file:///work/App', 'file:///work/App')).toBe(true);
    });

    it('AC-012: different folders stay different on Windows', () => {
        expect(sameRootFor('win32')('file:///c%3A/a', 'file:///c%3A/b')).toBe(false);
    });
});
