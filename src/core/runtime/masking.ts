import type { CredentialValuesPort } from '../ports/runtimeMedium';
import type { JsonValue } from './model';

export const MASK_PLACEHOLDER = '[masked]';

export interface SecretPattern {
    name: string;
    category: 'provider-token' | 'bearer-token' | 'private-key';
    source: string;
    flags: string;
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
    {
        name: 'github-token',
        category: 'provider-token',
        source: '\\bgh[pousr]_[A-Za-z0-9]{36,}',
        flags: 'g',
    },
    {
        name: 'github-fine-grained-token',
        category: 'provider-token',
        source: 'github_pat_[A-Za-z0-9_]{22,}',
        flags: 'g',
    },
    {
        name: 'anthropic-key',
        category: 'provider-token',
        source: 'sk-ant-[A-Za-z0-9_-]{20,}',
        flags: 'g',
    },
    {
        name: 'secret-key',
        category: 'provider-token',
        source: '\\bsk-[A-Za-z0-9_-]{20,}',
        flags: 'g',
    },
    {
        name: 'bearer-token',
        category: 'bearer-token',
        source: '\\bBearer\\s+[A-Za-z0-9._~+/=-]{16,}',
        flags: 'gi',
    },
    {
        name: 'private-key-block',
        category: 'private-key',
        source: '-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----',
        flags: 'g',
    },
];

export interface Masker {
    text(value: string): string;
    json<T extends JsonValue>(value: T): T;
}

export function createMasker(credentials: CredentialValuesPort): Masker {
    const compiled = SECRET_PATTERNS.map((pattern) => new RegExp(pattern.source, pattern.flags));

    function text(value: string): string {
        let masked = value;
        const held = credentials
            .values()
            .filter((credential) => credential !== '')
            .sort((a, b) => b.length - a.length);
        for (const credential of held) {
            masked = masked.split(credential).join(MASK_PLACEHOLDER);
        }
        for (const pattern of compiled) {
            masked = masked.replace(pattern, MASK_PLACEHOLDER);
        }
        return masked;
    }

    function json<T extends JsonValue>(value: T): T {
        if (typeof value === 'string') {
            return text(value) as T;
        }
        if (Array.isArray(value)) {
            return value.map((item) => json(item)) as T;
        }
        if (typeof value === 'object' && value !== null) {
            const copy: { [key: string]: JsonValue } = {};
            for (const [key, item] of Object.entries(value)) {
                copy[key] = json(item);
            }
            return copy as T;
        }
        return value;
    }

    return { text, json };
}
