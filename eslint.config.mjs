import { builtinModules } from "node:module";
import typescriptEslint from "typescript-eslint";

export default [{
    files: ["**/*.ts"],
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
            patterns: [{ group: ["vscode/*"], message: "Core code never imports vscode." }],
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