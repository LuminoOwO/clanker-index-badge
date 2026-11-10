// Entry point for the GitHub Action (see action.yml).
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { generate } from './generate.js';
import { ConfigError } from './config.js';

const input = (name, fallback) => {
  const v = process.env[`INPUT_${name.toUpperCase()}`];
  return v == null || v === '' ? fallback : v;
};
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

try {
  const repo = process.env.GITHUB_WORKSPACE || '.';
  const out = input('out', '.clanker');
  const res = generate({ repo, config: input('config', '.clanker.yml'), out });
  for (const w of res.warnings) console.log(`::warning title=Clanker Index::${w}`);
  console.log(`Overall: ${res.data.overall ?? 'n/a'}% AI`);
  for (const c of res.data.categories) console.log(`  ${c.label}: ${c.ai}% AI`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Clanker Index\n\nPaste this into your README:\n\n\`\`\`html\n${res.snippet}\n\`\`\`\n`);
  }

  if (input('commit', 'true') === 'true') {
    git(['add', '--', out], repo);
    const staged = git(['diff', '--cached', '--name-only', '--', out], repo).trim();
    if (!staged) console.log('Badges unchanged, nothing to commit.');
    else {
      git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', input('commit-message', 'chore: update clanker index'), '--', out], repo);
      git(['push'], repo);
      console.log('Committed updated badges.');
    }
  }
} catch (e) {
  const msg = e instanceof ConfigError ? e.message : (e && e.stack) || String(e);
  console.log(`::error title=Clanker Index::${msg.replace(/\n/g, '%0A')}`);
  process.exitCode = 1;
}
