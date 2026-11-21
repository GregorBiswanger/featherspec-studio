const esbuild = require("esbuild");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

const hostBuildOptions = {
	entryPoints: [
		'src/extension.ts'
	],
	bundle: true,
	format: 'cjs',
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	platform: 'node',
	outfile: 'dist/extension.js',
	external: ['vscode'],
	logLevel: 'silent',
	plugins: [
		/* add to the end of plugins array */
		esbuildProblemMatcherPlugin,
	],
};

const embeddedPathShimPlugin = {
	name: 'embedded-path-shim',

	setup(build) {
		build.onResolve({ filter: /^(node:)?path$/ }, () => ({
			path: path.join(__dirname, 'src', 'hosts', 'embedded', 'pathPosix.ts'),
		}));
	},
};

const embeddedBuildOptions = {
	entryPoints: [
		'src/hosts/embedded/global.ts'
	],
	bundle: true,
	format: 'iife',
	minify: production,
	sourcemap: false,
	platform: 'browser',
	target: 'es2022',
	outfile: 'dist/embedded/core.js',
	logLevel: 'silent',
	plugins: [
		embeddedPathShimPlugin,
		esbuildProblemMatcherPlugin,
	],
};

async function main() {
	const hostContext = await esbuild.context(hostBuildOptions);
	const webviewContext = await esbuild.context({
		entryPoints: [
			'src/webview/main.tsx'
		],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: false,
		platform: 'browser',
		target: 'es2022',
		jsx: 'automatic',
		define: { 'process.env.NODE_ENV': production ? '"production"' : '"development"' },
		outdir: 'dist/webview',
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});
	const embeddedContext = await esbuild.context(embeddedBuildOptions);
	const contexts = [hostContext, webviewContext, embeddedContext];
	if (watch) {
		await Promise.all(contexts.map((ctx) => ctx.watch()));
	} else {
		await Promise.all(contexts.map((ctx) => ctx.rebuild()));
		await Promise.all(contexts.map((ctx) => ctx.dispose()));
	}
}

if (require.main === module) {
	main().catch(e => {
		console.error(e);
		process.exit(1);
	});
}

module.exports = { hostBuildOptions };
