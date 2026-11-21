import { readFileSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const NETWORK = /\bfetch\(|\bXMLHttpRequest\b|\bWebSocket\b|(?:from\s+|require\()\s*'(?:node:)?(?:http|https|net)'/;

function sources(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
        const full = path.join(directory, name);
        if (statSync(full).isDirectory()) {
            return name === 'node_modules' ? [] : sources(full);
        }
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
    });
}

describe('0014 AC-025 for the hosts (0034 T-019): no source under src/hosts reaches the network', () => {
    it('no non-test source calls fetch, XMLHttpRequest, WebSocket or imports node:http, node:https or node:net', () => {
        const files = sources(__dirname);
        expect(files.length).toBeGreaterThan(0);
        const users = files.filter((file) => NETWORK.test(readFileSync(file, 'utf8')));
        expect(users.map((file) => path.relative(__dirname, file).split(path.sep).join('/'))).toEqual([]);
    });

    it('negative control: the matcher finds each forbidden form and spares the allowed ones', () => {
        for (const text of ["await fetch('https://example.org');", 'new XMLHttpRequest();', "new WebSocket('wss://x');", "import * as http from 'node:http';", "import { get } from 'https';", "const net = require('node:net');"]) {
            expect(NETWORK.test(text), text).toBe(true);
        }
        for (const text of ["import * as path from 'node:path';", 'const prefetched = 1;', "import { createServer } from 'node:fs';"]) {
            expect(NETWORK.test(text), text).toBe(false);
        }
    });
});
