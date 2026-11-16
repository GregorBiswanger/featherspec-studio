export interface WebviewHtmlInput {
    cspSource: string;
    nonce: string;
    scriptUri: string;
    styleUri: string;
    reloaded: boolean;
    test: boolean;
}

export function buildWebviewHtml(input: WebviewHtmlInput): string {
    const policy = [
        "default-src 'none'",
        `style-src ${input.cspSource}`,
        `script-src 'nonce-${input.nonce}'`,
        `img-src ${input.cspSource} data:`,
        `font-src ${input.cspSource}`,
    ].join('; ');
    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="UTF-8">',
        `<meta http-equiv="Content-Security-Policy" content="${policy}">`,
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>FeatherSpec Studio</title>',
        `<link rel="stylesheet" href="${input.styleUri}">`,
        '</head>',
        `<body data-reloaded="${input.reloaded}" data-test="${input.test}">`,
        '<div id="root"></div>',
        `<script nonce="${input.nonce}" src="${input.scriptUri}"></script>`,
        '</body>',
        '</html>',
        '',
    ].join('\n');
}
