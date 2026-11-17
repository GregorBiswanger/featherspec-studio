import { configDefaults, defineConfig } from 'vitest/config';

const TIMING = '**/*.timing.test.{ts,tsx}';
const TIMING_FRAMEWORK_LIMIT_MS = 120_000;
const timingLimits = { testTimeout: TIMING_FRAMEWORK_LIMIT_MS, hookTimeout: TIMING_FRAMEWORK_LIMIT_MS };
// The framework limit is no budget. Tests on the real file system take seconds on a busy Windows machine
// (4 to 6 s seen for one store contract test); a decision budget is asserted inside the test that owns it.
const FRAMEWORK_LIMIT_MS = 30_000;

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
        testTimeout: FRAMEWORK_LIMIT_MS,
        hookTimeout: FRAMEWORK_LIMIT_MS,
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
                test: { ...node, ...timingLimits, name: 'timing-node', include: ['src/**/*.timing.test.ts'] },
            },
            {
                extends: true,
                test: { ...webview, ...timingLimits, name: 'timing-webview', include: ['src/webview/**/*.timing.test.{ts,tsx}'] },
            },
        ],
    },
});
