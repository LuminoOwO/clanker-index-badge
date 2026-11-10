import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { loadConfig } from './config.js';
import { measure } from './git.js';
import { buildBadgeData } from './model.js';
import { render } from './render.js';

export const OUTPUTS = ['clanker-dark', 'clanker-light', 'serious-dark', 'serious-light'];

export function readmeSnippet(style, outDir, repo = '.') {
  const rel = relative(resolve(repo), resolve(repo, outDir)).split('\\').join('/') || '.';
  const alt = style === 'clanker' ? 'Clanker Index' : 'AI contribution by category';
  return [
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${rel}/${style}-dark.svg">`,
    `  <img alt="${alt}" src="${rel}/${style}-light.svg">`,
    '</picture>',
  ].join('\n');
}

/** Read config + git, write all four SVGs and data.json. */
export function generate({ repo = '.', config = '.clanker.yml', out = '.clanker', write = true } = {}) {
  const loaded = loadConfig(resolve(repo, config));
  const cfg = loaded.config;
  const auto = Object.entries(cfg.categories).filter(([, c]) => c.mode === 'auto').map(([id]) => id);
  const measured = measure(resolve(repo), auto, cfg.paths);
  const data = buildBadgeData(cfg, measured.result);
  const warnings = [...loaded.warnings, ...measured.warnings];
  if (loaded.missing) warnings.unshift(`No ${config} found, using the defaults (code, bug fixing, tests and docs from git).`);

  const files = {};
  for (const name of OUTPUTS) {
    const [style, theme] = name.split('-');
    files[`${name}.svg`] = render(data, style, theme) + '\n';
  }
  files['data.json'] = JSON.stringify({ style: cfg.style, ...data }, null, 2) + '\n';

  if (write) {
    const dir = resolve(repo, out);
    mkdirSync(dir, { recursive: true });
    for (const [f, content] of Object.entries(files)) writeFileSync(join(dir, f), content);
  }
  return { data, warnings, files, style: cfg.style, snippet: readmeSnippet(cfg.style, out, repo) };
}
