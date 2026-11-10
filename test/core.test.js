import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeConfig, ConfigError } from '../src/config.js';
import { resolveModel, detectAI } from '../src/palette.js';
import { buildCategory, roundTo100 } from '../src/model.js';
import { render } from '../src/render.js';
import { generate } from '../src/generate.js';
import { globToRegExp } from '../src/glob.js';

test('model names are forgiving', () => {
  assert.equal(resolveModel('Claude'), 'claude');
  assert.equal(resolveModel('GitHub Copilot'), 'copilot');
  assert.equal(resolveModel('dall-e'), 'gpt-image');
  assert.equal(resolveModel('Nano Banana'), 'nano-banana');
  assert.equal(resolveModel('meatbag'), 'human');
  assert.equal(resolveModel('clod'), null);
});

test('commit identities are detected', () => {
  assert.equal(detectAI('Claude <noreply@anthropic.com>'), 'claude');
  assert.equal(detectAI('Codex <codex@openai.com>'), 'codex');
  assert.equal(detectAI('copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>'), 'copilot');
  assert.equal(detectAI('Cursor Agent <cursoragent@cursor.com>'), 'cursor');
  assert.equal(detectAI('dependabot[bot] <support@github.com>'), null);
  assert.equal(detectAI('Jane Doe <jane@example.com>'), null);
});

test('typos get a suggestion', () => {
  assert.throws(() => normalizeConfig({ categories: { images: { midjurney: 50 } } }), (e) => e instanceof ConfigError && /Did you mean "midjourney"/.test(e.message));
  assert.throws(() => normalizeConfig({ stlye: 'clanker' }), /Did you mean "style"/);
  assert.throws(() => normalizeConfig({ categories: { ideas: 'auto' } }), /can't be measured from git/);
});

test('missing share is counted as human', () => {
  const { config, warnings } = normalizeConfig({ categories: { audio: { suno: 60 } } });
  assert.deepEqual(config.categories.audio.shares, { suno: 60, human: 40 });
  assert.equal(warnings.length, 1);
});

test('percentages always add up to 100', () => {
  const r = roundTo100([{ id: 'a', value: 1 }, { id: 'b', value: 1 }, { id: 'c', value: 1 }]);
  assert.equal(r.reduce((a, b) => a + b.p, 0), 100);
});

test('sorting: biggest AI first, small ones grouped, human last', () => {
  const c = buildCategory({ human: 10, claude: 20, grok: 1, kimi: 1, deepseek: 68 }, { minShare: 2 });
  assert.deepEqual(c.shares.map((s) => s.id), ['deepseek', 'claude', 'other', 'human']);
  assert.equal(c.ai, 90);
});

test('merge counts one AI as another', () => {
  const c = buildCategory({ cursor: 50, claude: 50 }, { merge: { cursor: 'claude' } });
  assert.deepEqual(c.shares, [{ id: 'claude', p: 100 }]);
});

test('globs', () => {
  assert.ok(globToRegExp('**/*.test.*').test('src/a.test.js'));
  assert.ok(globToRegExp('*.md').test('docs/deep/x.md'));
  assert.ok(globToRegExp('docs/**').test('docs/a/b.txt'));
  assert.ok(!globToRegExp('docs/**').test('src/docs.js'));
});

test('renders valid-looking SVG in all four variants', () => {
  const data = { overall: 80, categories: [
    { id: 'code', label: 'Code', ai: 84, estimated: false, shares: [{ id: 'claude', p: 52 }, { id: 'cursor', p: 16 }, { id: 'gemini', p: 16 }, { id: 'human', p: 16 }] },
    { id: 'images', label: 'Images', ai: 90, estimated: true, shares: [{ id: 'midjourney', p: 90 }, { id: 'human', p: 10 }] },
  ] };
  for (const style of ['clanker', 'serious']) for (const theme of ['light', 'dark']) {
    const svg = render(data, style, theme);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 720 \d+"/);
    assert.ok(!/NaN|undefined/.test(svg), `${style}-${theme} has NaN/undefined`);
    assert.ok(svg.includes('~90%'));
  }
});

test('end to end on a real git repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'clanker-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Jane'); g('config', 'user.email', 'jane@example.com');
  mkdirSync(join(dir, 'src')); mkdirSync(join(dir, 'test'));
  writeFileSync(join(dir, 'src/app.js'), 'a\nb\nc\nd\n');
  g('add', '.'); g('commit', '-q', '-m', 'feat: app\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
  writeFileSync(join(dir, 'src/util.js'), 'x\n');
  writeFileSync(join(dir, 'test/app.test.js'), 't1\nt2\n');
  g('add', '.'); g('commit', '-q', '-m', 'add tests\n\nClanker-Model: codex');
  writeFileSync(join(dir, 'src/app.js'), 'a\nb\nc\nFIXED\n');
  g('commit', '-q', '-am', 'fix: off by one');
  writeFileSync(join(dir, '.clanker.yml'), 'categories:\n  code: auto\n  tests: auto\n  bugfix: auto\n  ideas: { human: 80, chatgpt: 20 }\n');
  const res = generate({ repo: dir });
  const by = Object.fromEntries(res.data.categories.map((c) => [c.id, c]));
  assert.deepEqual(by.code.shares, [{ id: 'claude', p: 60 }, { id: 'codex', p: 20 }, { id: 'human', p: 20 }]);
  assert.deepEqual(by.tests.shares, [{ id: 'codex', p: 100 }]);
  assert.deepEqual(by.bugfix.shares, [{ id: 'human', p: 100 }]);
  assert.equal(by.ideas.ai, 20);
  assert.equal(Object.keys(res.files).length, 5);
});
