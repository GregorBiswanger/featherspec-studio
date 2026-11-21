import { describe, expect, it } from 'vitest';
import { buildWebviewHtml, type WebviewHtmlInput } from './webviewHtml';

const input: WebviewHtmlInput = {
    cspSource: 'https://file+.vscode-resource.vscode-cdn.net',
    nonce: 'abc123NONCE',
    scriptUri: 'https://file+.vscode-resource.vscode-cdn.net/ext/dist/webview/main.js',
    styleUri: 'https://file+.vscode-resource.vscode-cdn.net/ext/dist/webview/main.css',
    reloaded: false,
    test: false,
};

function csp(html: string): string {
    return /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
}

describe('AC-020: the panel HTML', () => {
    it('sets the ADR-001 policy: default-src none, styles and images from the extension only, scripts by nonce', () => {
        expect(csp(buildWebviewHtml(input))).toBe(
            `default-src 'none'; style-src ${input.cspSource}; script-src 'nonce-${input.nonce}'; img-src ${input.cspSource} data:; font-src ${input.cspSource}`,
        );
    });

    it('has no connect-src, no unsafe-inline, no unsafe-eval and no remote origin in the policy', () => {
        const policy = csp(buildWebviewHtml(input));
        expect(policy).not.toContain('connect-src');
        expect(policy).not.toContain('unsafe');
        expect(policy).not.toMatch(/https?:\/\/(?!file\+\.vscode-resource)/);
    });

    it('puts the nonce on the one script element only and loads the script and the stylesheet from the extension URIs', () => {
        const html = buildWebviewHtml(input);
        expect(html.match(/nonce="/g)).toHaveLength(1);
        expect(html).toContain(`<script nonce="${input.nonce}" src="${input.scriptUri}"></script>`);
        expect(html.match(/<script/g)).toHaveLength(1);
        expect(html).toContain(`<link rel="stylesheet" href="${input.styleUri}">`);
        expect(html).not.toMatch(/<style|\sstyle="|\son[a-z]+="/);
    });

    it('references no remote origin anywhere in the markup', () => {
        const markup = buildWebviewHtml(input).replace(csp(buildWebviewHtml(input)), '');
        const origins = [...markup.matchAll(/https?:\/\/[^\s"']+/g)].map((match) => match[0]);
        expect(origins.every((origin) => origin.startsWith('https://file+.vscode-resource.vscode-cdn.net/'))).toBe(true);
    });

    it('carries the data-reloaded and data-test flags on the body, off by default', () => {
        expect(buildWebviewHtml(input)).toContain('<body data-reloaded="false" data-test="false">');
        expect(buildWebviewHtml({ ...input, reloaded: true })).toContain('data-reloaded="true"');
        expect(buildWebviewHtml({ ...input, test: true })).toContain('data-test="true"');
    });

    it('has a root element for the panel UI and a title', () => {
        const html = buildWebviewHtml(input);
        expect(html).toContain('<div id="root"></div>');
        expect(html).toContain('<title>FeatherSpec Studio</title>');
    });
});

describe('§6.8: the host attribute of the panel HTML', () => {
    it('adds no data-host attribute without a host', () => {
        expect(buildWebviewHtml(input)).not.toContain('data-host');
    });

    it('puts data-host jetbrains on the body only when the JetBrains host is given', () => {
        expect(buildWebviewHtml({ ...input, host: 'jetbrains' })).toContain('<body data-reloaded="false" data-test="false" data-host="jetbrains">');
    });
});
