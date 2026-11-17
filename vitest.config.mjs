import { configDefaults, defineConfig } from 'vitest/config';

const TIMING = '**/*.timing.test.{ts,tsx}';

const node = {
    environment: 'node',
    exclude: ['src/test/**', 'src/webview/**', ...configDefaults.exclude],
};

const webview = {
    environment: 'jsdom',
    setupFiles: ['src/webview/testing/setup.ts'],
    css: { include: [/main\.css/] },
};

export default defineConfig({
    test: {
        projects: [
            {
                extends: true,
                test: { ...node, name: 'node', include: ['src/**/*.test.ts'], exclude: [...node.exclude, TIMING] },
            },
            {
                extends: true,
                test: { ...webview, name: 'webview', include: ['src/webview/**/*.test.{ts,tsx}'], exclude: [...configDefaults.exclude, TIMING] },
            },
            {
                extends: true,
                test: { ...node, name: 'timing-node', include: ['src/**/*.timing.test.ts'] },
            },
            {
                extends: true,
                test: { ...webview, name: 'timing-webview', include: ['src/webview/**/*.timing.test.{ts,tsx}'] },
            },
        ],
    },
});
