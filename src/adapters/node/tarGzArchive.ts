import { gunzip } from 'node:zlib';
import type { ArchiveEntry, ArchiveEntryKind, ArchiveReadResult, ReleaseArchivePort } from '../../core/ports/releaseArchive';

const BLOCK = 512;

class TarFormatError extends Error {}

function gunzipLimited(bytes: Uint8Array, maxOutputLength: number): Promise<{ data: Uint8Array } | { failure: 'too-large' } | { failure: 'unreadable'; detail: string }> {
    return new Promise((resolve) => {
        gunzip(bytes, { maxOutputLength }, (error, data) => {
            if (error === null) {
                resolve({ data });
                return;
            }
            const code = (error as NodeJS.ErrnoException).code;
            resolve(code === 'ERR_BUFFER_TOO_LARGE' ? { failure: 'too-large' } : { failure: 'unreadable', detail: error.message });
        });
    });
}

function text(block: Uint8Array, start: number, length: number): string {
    const slice = block.subarray(start, start + length);
    const end = slice.indexOf(0);
    return new TextDecoder().decode(end === -1 ? slice : slice.subarray(0, end));
}

function number(block: Uint8Array, start: number, length: number): number {
    const field = block.subarray(start, start + length);
    if (((field[0] ?? 0) & 0x80) !== 0) {
        let value = (field[0] ?? 0) & 0x7f;
        for (let index = 1; index < field.length; index++) {
            value = value * 256 + (field[index] ?? 0);
        }
        if (!Number.isSafeInteger(value)) {
            throw new TarFormatError('a size is out of range');
        }
        return value;
    }
    const digits = text(block, start, length).trim();
    if (digits === '') {
        return 0;
    }
    if (!/^[0-7]+$/.test(digits)) {
        throw new TarFormatError('a header field is not a number');
    }
    return parseInt(digits, 8);
}

function isZero(block: Uint8Array): boolean {
    return block.every((byte) => byte === 0);
}

function checksumOk(block: Uint8Array): boolean {
    let sum = 0;
    for (let index = 0; index < BLOCK; index++) {
        sum += index >= 148 && index < 156 ? 32 : (block[index] ?? 0);
    }
    return sum === number(block, 148, 8);
}

function paxPath(records: Uint8Array): string | undefined {
    let offset = 0;
    let found: string | undefined;
    while (offset < records.length) {
        const space = records.indexOf(32, offset);
        const length = Number(new TextDecoder().decode(records.subarray(offset, space)));
        if (space === -1 || !Number.isInteger(length) || length <= space - offset + 1 || offset + length > records.length) {
            throw new TarFormatError('an extended header record is malformed');
        }
        const record = new TextDecoder().decode(records.subarray(space + 1, offset + length - 1));
        const equals = record.indexOf('=');
        if (record.slice(0, equals) === 'path') {
            found = record.slice(equals + 1);
        }
        offset += length;
    }
    return found;
}

function kindOf(type: string): ArchiveEntryKind {
    switch (type) {
        case '0':
        case '\0':
        case '':
            return 'file';
        case '5':
            return 'directory';
        case 'g':
        case 'x':
            return 'metadata';
        default:
            return 'other';
    }
}

function parse(data: Uint8Array): ArchiveEntry[] {
    const entries: ArchiveEntry[] = [];
    let offset = 0;
    let nextPath: string | undefined;
    while (offset < data.length) {
        const block = data.subarray(offset, offset + BLOCK);
        if (block.length < BLOCK) {
            throw new TarFormatError('the archive ends inside a header');
        }
        if (isZero(block)) {
            return entries;
        }
        if (!checksumOk(block)) {
            throw new TarFormatError('a header checksum is wrong');
        }
        const type = text(block, 156, 1);
        const size = number(block, 124, 12);
        const start = offset + BLOCK;
        if (start + size > data.length) {
            throw new TarFormatError('the archive ends inside a file');
        }
        const content = data.subarray(start, start + size);
        offset = start + Math.ceil(size / BLOCK) * BLOCK;
        const prefix = text(block, 257, 5) === 'ustar' ? text(block, 345, 155) : '';
        const headerName = text(block, 0, 100);
        const name = prefix === '' ? headerName : `${prefix}/${headerName}`;
        if (type === 'x') {
            nextPath = paxPath(content);
            continue;
        }
        if (type === 'g') {
            entries.push({ path: name, kind: 'metadata', bytes: new Uint8Array() });
            continue;
        }
        const kind = kindOf(type);
        entries.push({ path: nextPath ?? name, kind, bytes: kind === 'file' ? content.slice() : new Uint8Array() });
        nextPath = undefined;
    }
    return entries;
}

export function createTarGzArchive(): ReleaseArchivePort {
    return {
        async read(bytes, maxUnpackedBytes): Promise<ArchiveReadResult> {
            const unpacked = await gunzipLimited(bytes, maxUnpackedBytes);
            if ('failure' in unpacked) {
                return unpacked.failure === 'too-large' ? { ok: false, failure: 'too-large' } : { ok: false, failure: 'unreadable', detail: unpacked.detail };
            }
            try {
                return { ok: true, entries: parse(unpacked.data) };
            } catch (error) {
                if (error instanceof TarFormatError) {
                    return { ok: false, failure: 'unreadable', detail: error.message };
                }
                throw error;
            }
        },
    };
}
