import { execFileSync } from 'node:child_process';
import { detectAI, resolveModel, IGNORED_BOTS } from './palette.js';
import { resolveCategory, DEFAULT_PATHS, fileKind } from './categories.js';
import { matchesAny } from './glob.js';

const SEP = '\x1f';
const END = '\x1e';

function git(repo, args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });
}

const FIX_SUBJECT = /^(fix|bugfix|hotfix)(\([^)]*\))?!?:|\b(fix(e[sd])?|bug ?fix(es)?)\b/i;

/**
 * Who made each commit.
 * Priority: "Clanker-Model:" trailer > Co-Authored-By AI > AI author/committer > human.
 */
export function readCommits(repo) {
  const out = git(repo, ['log', '--format=%H' + SEP + '%an <%ae>' + SEP + '%cn <%ce>' + SEP + '%B' + END, 'HEAD']);
  const commits = new Map();
  for (const rec of out.split(END)) {
    const [sha, author, committer, body = ''] = rec.replace(/^\s+/, '').split(SEP);
    if (!sha || sha.length < 40) continue;
    const trailers = (re) => [...body.matchAll(re)].map((m) => m[1].trim());

    let ai = null;
    for (const v of trailers(/^clanker-model:\s*(.+)$/gim)) { ai = resolveModel(v) || detectAI(v); if (ai) break; }
    if (!ai) for (const v of trailers(/^co-authored-by:\s*(.+)$/gim)) { ai = detectAI(v); if (ai) break; }
    if (!ai) ai = detectAI(author) || detectAI(committer);

    const category = trailers(/^clanker-category:\s*(.+)$/gim).map(resolveCategory).find(Boolean) || null;
    const subject = body.split('\n')[0] || '';
    commits.set(sha, {
      ai,
      ignored: !ai && IGNORED_BOTS.test(author.toLowerCase()),
      category,
      fix: category === 'bugfix' || (!category && FIX_SUBJECT.test(subject)),
    });
  }
  return commits;
}

function classify(path, paths) {
  const kind = fileKind(path);
  if (kind !== 'text') return kind;
  if (matchesAny(path, [...DEFAULT_PATHS.tests, ...paths.tests])) return 'tests';
  if (matchesAny(path, [...DEFAULT_PATHS.docs, ...paths.docs])) return 'docs';
  return 'code';
}

function add(bucket, who, n) {
  bucket[who] = (bucket[who] || 0) + n;
}

/**
 * Raw counts for the auto categories:
 *   code/tests/docs  surviving lines (git blame), so rewritten code moves to whoever rewrote it
 *   bugfix           lines added + removed in bug-fix commits
 *   images/audio/video  files, credited to the commit that added them
 */
export function measure(repo, wanted, paths = { ignore: [], tests: [], docs: [] }) {
  const result = {};
  for (const c of wanted) result[c] = {};
  const warnings = [];
  if (!wanted.length) return { result, warnings };

  try { git(repo, ['rev-parse', 'HEAD']); } catch {
    return { result, warnings: ['No commits found, so the auto categories are empty.'] };
  }
  if (git(repo, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    warnings.push('This is a shallow clone, so older history is missing. In GitHub Actions use "actions/checkout" with "fetch-depth: 0".');
  }

  const commits = readCommits(repo);
  const whoOf = (sha) => {
    const c = commits.get(sha);
    if (!c) return 'human';
    if (c.ignored) return null;
    return c.ai || 'human';
  };
  const ignore = [...DEFAULT_PATHS.ignore, ...paths.ignore];
  const files = git(repo, ['ls-files', '-z']).split('\0').filter((f) => f && !matchesAny(f, ignore));

  const blameCats = ['code', 'tests', 'docs'].filter((c) => wanted.includes(c));
  if (blameCats.length) {
    for (const file of files) {
      const kind = classify(file, paths);
      if (!['code', 'tests', 'docs'].includes(kind)) continue;
      let out;
      try { out = git(repo, ['blame', '--porcelain', '-w', 'HEAD', '--', file]); } catch { continue; }
      for (const m of out.matchAll(/^([0-9a-f]{40}) \d+ \d+ (\d+)$/gm)) {
        const sha = m[1];
        const c = commits.get(sha);
        const cat = c && ['code', 'tests', 'docs'].includes(c.category) ? c.category : kind;
        if (!result[cat]) continue;
        const who = whoOf(sha);
        if (who) add(result[cat], who, Number(m[2]));
      }
    }
  }

  if (wanted.includes('bugfix')) {
    const log = git(repo, ['log', '--format=@@%H', '--numstat', 'HEAD']);
    let sha = null;
    for (const line of log.split('\n')) {
      if (line.startsWith('@@')) { sha = line.slice(2).trim(); continue; }
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
      if (!m || !sha || !commits.get(sha)?.fix || m[1] === '-' || matchesAny(m[3], ignore)) continue;
      const who = whoOf(sha);
      if (who) add(result.bugfix, who, Number(m[1]) + Number(m[2]));
    }
  }

  const media = ['images', 'audio', 'video'].filter((c) => wanted.includes(c));
  if (media.length) {
    const present = new Set(files);
    const added = new Map();
    const log = git(repo, ['log', '--diff-filter=A', '--format=@@%H', '--name-only', 'HEAD']);
    let sha = null;
    for (const line of log.split('\n')) {
      if (line.startsWith('@@')) { sha = line.slice(2).trim(); continue; }
      const f = line.trim();
      if (f && sha && present.has(f) && !added.has(f)) added.set(f, sha);
    }
    for (const [f, s] of added) {
      const kind = fileKind(f);
      if (!result[kind]) continue;
      const who = whoOf(s);
      if (who) add(result[kind], who, 1);
    }
  }

  return { result, warnings };
}
