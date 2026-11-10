// Bundles the CLI and the GitHub Action into single files in dist/ (no npm install needed to run them).
import { build } from 'esbuild';

const banner = { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" };
for (const [entry, outfile] of [['src/bin.js', 'dist/cli.js'], ['src/action.js', 'dist/action.js']]) {
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', target: 'node20', format: 'esm', banner, legalComments: 'none' });
}
console.log('built dist/cli.js and dist/action.js');
