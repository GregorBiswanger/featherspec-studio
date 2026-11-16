import { describe, expect, it } from 'vitest';
import { eventRelativePath, isCaseInsensitivePlatform } from './eventPath';

describe('isCaseInsensitivePlatform', () => {
    it('AC-012: Windows and macOS compare paths case-insensitively, Linux does not', () => {
        expect(isCaseInsensitivePlatform('win32')).toBe(true);
        expect(isCaseInsensitivePlatform('darwin')).toBe(true);
        expect(isCaseInsensitivePlatform('linux')).toBe(false);
    });
});

describe('eventRelativePath', () => {
    const root = 'file:///c%3A/projects/shop';

    it('AC-012: turns an event URI under the root into a project-relative path', () => {
        expect(eventRelativePath(root, 'file:///c%3A/projects/shop/.specs/active/0001-a.md', 'win32')).toBe('.specs/active/0001-a.md');
    });

    it('AC-012: decodes percent-encoded segments', () => {
        expect(eventRelativePath('file:///home/me/my%20shop', 'file:///home/me/my%20shop/.specs/done/0002-%C3%A4.md', 'linux')).toBe(
            '.specs/done/0002-ä.md',
        );
    });

    it('AC-012: a differently cased drive letter or folder matches on Windows and macOS only, keeping the reported case of the rest', () => {
        const event = 'file:///C%3A/Projects/Shop/.SPECS/Active/0001-A.md';
        expect(eventRelativePath(root, event, 'win32')).toBe('.SPECS/Active/0001-A.md');
        expect(eventRelativePath(root, event, 'darwin')).toBe('.SPECS/Active/0001-A.md');
        expect(eventRelativePath(root, event, 'linux')).toBeUndefined();
    });

    it('AC-021: an event outside the root or only sharing a name prefix gives no path', () => {
        expect(eventRelativePath(root, 'file:///c%3A/projects/shop-two/.specs/a.md', 'win32')).toBeUndefined();
        expect(eventRelativePath(root, 'file:///c%3A/projects/other/.specs/a.md', 'win32')).toBeUndefined();
    });

    it('AC-012: the root itself and a trailing slash on the root give an empty path or the same result', () => {
        expect(eventRelativePath(root, root, 'linux')).toBe('');
        expect(eventRelativePath(`${root}/`, `${root}/.specs`, 'linux')).toBe('.specs');
    });
});
