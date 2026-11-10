// Renders every examples/*.yml into examples/<name>/*.svg (used by the README gallery).
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { loadConfig } from '../src/config.js';
import { buildBadgeData } from '../src/model.js';
import { render } from '../src/render.js';
import { OUTPUTS } from '../src/generate.js';

for (const f of readdirSync('examples').filter((x) => x.endsWith('.yml'))) {
  const name = basename(f, '.yml');
  const { config } = loadConfig(join('examples', f));
  const data = buildBadgeData(config, {});
  mkdirSync(join('examples', name), { recursive: true });
  for (const o of OUTPUTS) {
    const [style, theme] = o.split('-');
    writeFileSync(join('examples', name, `${o}.svg`), render(data, style, theme) + '\n');
  }
  console.log(`examples/${name}: ${data.categories.length} categories, ${data.overall}% overall`);
}
