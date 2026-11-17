import { gzipSync } from 'node:zlib';

export interface TarEntrySpec {
    path: string;
    type?: string;
    content?: string | Uint8Array;
    linkname?: string;
    pax?: Record<string, string>;
    prefix?: string;
}

const BLOCK = 512;

function octal(value: number, length: number): string {
    return `${value.toString(8).padStart(length - 1, '0')}\0`;
}

function header(name: string, type: string, size: number, options: { prefix?: string; linkname?: string; magic?: boolean } = {}): Uint8Array {
    const block = new Uint8Array(BLOCK);
    const put = (text: string, offset: number): void => {
        block.set(new TextEncoder().encode(text), offset);
    };
    put(name, 0);
    put(octal(0o644, 8), 100);
    put(octal(0, 8), 108);
    put(octal(0, 8), 116);
    put(octal(size, 12), 124);
    put(octal(0, 12), 136);
    put('        ', 148);
    put(type, 156);
    put(options.linkname ?? '', 157);
    if (options.magic !== false) {
        put('ustar\0', 257);
        put('00', 263);
    }
    put(options.prefix ?? '', 345);
    let sum = 0;
    for (const byte of block) {
        sum += byte;
    }
    put(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    return block;
}

function padded(data: Uint8Array): Uint8Array {
    const size = Math.ceil(data.length / BLOCK) * BLOCK;
    const out = new Uint8Array(size);
    out.set(data, 0);
    return out;
}

function paxRecords(records: Record<string, string>): Uint8Array {
    const encoder = new TextEncoder();
    const parts = Object.entries(records).map(([key, value]) => {
        const body = `${key}=${value}\n`;
        let length = encoder.encode(body).length + 3;
        while (String(length).length + 1 + encoder.encode(body).length !== length) {
            length = String(length).length + 1 + encoder.encode(body).length;
        }
        return encoder.encode(`${length} ${body}`);
    });
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

export function tarBytes(entries: readonly TarEntrySpec[], options: { corruptChecksumOf?: number; truncateBy?: number; endMarker?: boolean } = {}): Uint8Array {
    const chunks: Uint8Array[] = [];
    entries.forEach((entry, index) => {
        const type = entry.type ?? (entry.path.endsWith('/') ? '5' : '0');
        const data = typeof entry.content === 'string' ? new TextEncoder().encode(entry.content) : (entry.content ?? new Uint8Array());
        if (entry.pax !== undefined) {
            const records = paxRecords(entry.pax);
            chunks.push(header('PaxHeader', entry.type === 'g' ? 'g' : 'x', records.length), padded(records));
            if (entry.type === 'g') {
                return;
            }
        }
        const name = entry.path.length > 100 && entry.prefix === undefined ? entry.path.slice(0, 100) : entry.path;
        const block = header(name, type, type === '5' || type === '1' || type === '2' ? 0 : data.length, {
            ...(entry.prefix === undefined ? {} : { prefix: entry.prefix }),
            ...(entry.linkname === undefined ? {} : { linkname: entry.linkname }),
        });
        if (options.corruptChecksumOf === index) {
            block[148] = '9'.charCodeAt(0);
        }
        chunks.push(block);
        if (type === '0' || type === '\0') {
            chunks.push(padded(data));
        }
    });
    if (options.endMarker !== false) {
        chunks.push(new Uint8Array(BLOCK * 2));
    }
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return options.truncateBy === undefined ? out : out.slice(0, out.length - options.truncateBy);
}

export function tarGz(entries: readonly TarEntrySpec[], options: Parameters<typeof tarBytes>[1] = {}): Uint8Array {
    return new Uint8Array(gzipSync(tarBytes(entries, options)));
}

export function releaseEntries(top: string, version = '1.10.0', extra: readonly TarEntrySpec[] = []): TarEntrySpec[] {
    return [
        { path: `${top}/`, type: '5' },
        { path: `${top}/AGENTS.md`, content: `# Constitution\n\n\`\`\`yaml\nFeatherSpecVersion: ${version} # managed\n\`\`\`\n` },
        { path: `${top}/.specs/`, type: '5' },
        { path: `${top}/.specs/README.md`, content: '# Specs\n' },
        { path: `${top}/README.md`, content: '# FeatherSpec\n' },
        ...extra,
    ];
}
