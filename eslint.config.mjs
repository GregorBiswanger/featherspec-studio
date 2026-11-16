import { builtinModules } from "node:module";
import typescriptEslint from "typescript-eslint";

const PROVIDER_SDK_GROUPS = ["@github/copilot-sdk", "@github/copilot-sdk/*", "@anthropic-ai/claude-agent-sdk", "@anthropic-ai/claude-agent-sdk/*", "@openai/codex-sdk", "@openai/codex-sdk/*"];

export default [{
    files: ["**/*.ts", "**/*.tsx"],
}, {
    files: ["src/core/**/*.ts"],
    rules: {
        "no-restricted-imports": ["error", {
            paths: [{ name: "vscode", message: "Core code never imports vscode; reach the host through ports." }],
            patterns: [{ group: ["vscode/*"], message: "Core code never imports vscode." }],
        }],
    },
}, {
    files: ["src/core/**/*.ts"],
    ignores: ["src/core/**/*.test.ts", "src/core/**/testing/**"],
    rules: {
        "no-restricted-imports": ["error", {
            paths: [
                { name: "vscode", message: "Core code never imports vscode; reach the host through ports." },
                ...["fs", "node:fs", "fs/promises", "node:fs/promises", "sqlite", "node:sqlite"].map((name) => ({
                    name,
                    message: "Core code reaches files and databases only through ports.",
                })),
            ],
            patterns: [
                { group: ["vscode/*"], message: "Core code never imports vscode." },
                { group: ["**/adapters/providers", "**/adapters/providers/**"], message: "Core code reaches providers only through the provider port." },
                { group: PROVIDER_SDK_GROUPS, message: "Core code never imports a provider SDK." },
            ],
        }],
    },
}, {
    files: ["src/shared/**/*.ts"],
    rules: {
        "no-restricted-imports": ["error", {
            paths: [
                { name: "vscode", message: "Shared protocol code never imports vscode." },
                ...builtinModules.map((name) => ({ name, message: "Shared protocol code never imports Node.js built-ins." })),
            ],
            patterns: [
                { group: ["vscode/*", "node:*"], message: "Shared protocol code imports neither vscode nor Node.js." },
                { group: ["**/core/**", "**/adapters/**", "**/webview/**"], message: "Shared protocol code imports only itself." },
            ],
        }],
    },
}, {
    files: ["src/webview/**/*.ts", "src/webview/**/*.tsx"],
    rules: {
        "no-restricted-imports": ["error", {
            paths: [
                { name: "vscode", message: "The panel UI never imports vscode." },
                ...builtinModules.map((name) => ({ name, message: "The panel UI never imports Node.js built-ins." })),
            ],
            patterns: [
                { group: ["vscode/*", "node:*"], message: "The panel UI imports neither vscode nor Node.js." },
                { group: ["**/core/**", "**/adapters/**"], message: "The panel UI imports only src/shared and its own files." },
            ],
        }],
    },
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint.plugin,
    },

    languageOptions: {
        parser: typescriptEslint.parser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
    },
}];