import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { generate } from './generate.js';
import { ConfigError } from './config.js';
import { MODELS } from './palette.js';
import { CATEGORIES } from './categories.js';
import { EXAMPLE_CONFIG, AGENTS_SNIPPET, AGENTS_MARKER, WORKFLOW } from './templates.js';

const HELP = `clanker-index: badge showing how much of a repo each AI made

Usage:
  clanker-index [generate]   build the badges into .clanker/ (default)
  clanker-index check        validate .clanker.yml and print the numbers, write nothing
  clanker-index init         add .clanker.yml, the GitHub workflow and the AGENTS.md section
  clanker-index models       list every AI and category the badge knows

Options:
  --config <file>   config file (default .clanker.yml)
  --out <dir>       output folder (default .clanker)
  --repo <dir>      repository folder (default .)
`;

function parseArgs(argv) {
  const opts = { cmd: 'generate' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.cmd = 'help';
    else if (a === '--config') opts.config = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--repo') opts.repo = argv[++i];
    else if (!a.startsWith('-')) opts.cmd = a;
    else throw new Error(`Unknown option ${a}. Try --help.`);
  }
  return opts;
}

function summary(data) {
  const lines = [];
  if (data.overall != null) lines.push(`Overall: ${data.overall}% AI`);
  for (const c of data.categories) {
    lines.push(`  ${c.label.padEnd(15)} ${String(c.ai).padStart(3)}% AI   ${c.shares.map((s) => `${s.id} ${s.p}%`).join(', ')}`);
  }
  if (!data.categories.length) lines.push('  (no data yet)');
  return lines.join('\n');
}

function writeIfMissing(path, content, label) {
  if (existsSync(path)) { console.log(`  skipped ${label} (already exists)`); return; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`  created ${label}`);
}

function init(repo) {
  console.log('Setting up Clanker Index:');
  writeIfMissing(resolve(repo, '.clanker.yml'), EXAMPLE_CONFIG, '.clanker.yml');
  writeIfMissing(resolve(repo, '.github/workflows/clanker-index.yml'), WORKFLOW, '.github/workflows/clanker-index.yml');
  const agents = resolve(repo, 'AGENTS.md');
  if (existsSync(agents) && readFileSync(agents, 'utf8').includes(AGENTS_MARKER)) console.log('  skipped AGENTS.md (section already there)');
  else if (existsSync(agents)) { appendFileSync(agents, '\n' + AGENTS_SNIPPET); console.log('  added the attribution section to AGENTS.md'); }
  else { writeFileSync(agents, '# Notes for AI agents\n\n' + AGENTS_SNIPPET); console.log('  created AGENTS.md'); }
  console.log('\nNext: commit these files and push. Then paste this into your README:\n');
  console.log(generate({ repo, write: false }).snippet);
}

function models() {
  const groups = { model: 'Models', tool: 'Agents and coding tools', image: 'Images', video: 'Video', audio: 'Audio and music' };
  for (const [g, title] of Object.entries(groups)) {
    console.log(`\n${title}`);
    for (const m of MODELS.filter((x) => x.group === g)) {
      console.log(`  ${m.id.padEnd(18)} ${m.name}${m.aliases.length ? `  (also: ${m.aliases.join(', ')})` : ''}`);
    }
  }
  console.log('\nSpecial\n  human              you\n  other              any AI not on this list');
  console.log(`\nCategories\n${CATEGORIES.map((c) => `  ${c.id.padEnd(18)} ${c.label}${c.auto ? '  (can be auto)' : ''}`).join('\n')}`);
}

export function main(argv = process.argv.slice(2)) {
  let opts;
  try { opts = parseArgs(argv); } catch (e) { console.error(e.message); return 2; }
  const repo = opts.repo || '.';
  try {
    if (opts.cmd === 'help') { console.log(HELP); return 0; }
    if (opts.cmd === 'models') { models(); return 0; }
    if (opts.cmd === 'init') { init(repo); return 0; }
    if (opts.cmd !== 'generate' && opts.cmd !== 'check') { console.error(`Unknown command "${opts.cmd}".\n\n${HELP}`); return 2; }
    const res = generate({ repo, config: opts.config, out: opts.out, write: opts.cmd === 'generate' });
    for (const w of res.warnings) console.warn('warning: ' + w);
    console.log(summary(res.data));
    if (opts.cmd === 'generate') console.log(`\nWrote 4 badges to ${opts.out || '.clanker'}/. README snippet:\n\n${res.snippet}`);
    return 0;
  } catch (e) {
    if (e instanceof ConfigError) { console.error(e.message); return 1; }
    throw e;
  }
}

