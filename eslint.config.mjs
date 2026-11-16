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