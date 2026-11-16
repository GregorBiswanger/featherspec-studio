import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: 'node',
                    environment: 'node',
                    include: ['src/**/*.test.ts'],
                    exclude: ['src/test/**', 'src/webview/**', ...configDefaults.exclude],
                },
            },
            {
                extends: true,
                test: {
                    name: 'webview',
                    environment: 'jsdom',
                    include: ['src/webview/**/*.test.{ts,tsx}'],
                    setupFiles: ['src/webview/testing/setup.ts'],
                },
            },
        ],
    },
});
