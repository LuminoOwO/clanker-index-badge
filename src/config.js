import { readFileSync, existsSync } from 'node:fs';
import YAML from 'yaml';
import { resolveModel, allModelKeys } from './palette.js';
import { resolveCategory, allCategoryKeys, CATEGORIES } from './categories.js';

export class ConfigError extends Error {
  constructor(problems) {
    super('Your .clanker.yml has ' + (problems.length === 1 ? 'a problem' : problems.length + ' problems') + ':\n' + problems.map((p) => '  • ' + p).join('\n'));
    this.problems = problems;
  }
}

const TOP_KEYS = ['style', 'title', 'overall', 'min_share', 'merge', 'categories', 'paths'];
const DEFAULT_CATEGORIES = { code: 'auto', bugfix: 'auto', tests: 'auto', docs: 'auto' };

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function suggest(input, options) {
  const s = String(input).toLowerCase();
  let best = null;
  let bestD = Infinity;
  for (const o of options) {
    const dd = distance(s, o);
    if (dd < bestD) { bestD = dd; best = o; }
  }
  return bestD <= Math.max(2, Math.floor(s.length / 3)) ? best : null;
}

const didYouMean = (input, options) => {
  const s = suggest(input, options);
  return s ? ` Did you mean "${s}"?` : '';
};

function parseShare(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\s*\d+(\.\d+)?\s*%?\s*$/.test(v)) return parseFloat(v);
  return NaN;
}

/** Validate a parsed config object. Returns { config, warnings } or throws ConfigError. */
export function normalizeConfig(raw = {}) {
  const problems = [];
  const warnings = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigError(['The file should be a list of settings like "style: clanker", not ' + (Array.isArray(raw) ? 'a list' : typeof raw) + '.']);
  }

  for (const k of Object.keys(raw)) {
    if (!TOP_KEYS.includes(k)) problems.push(`Unknown setting "${k}".${didYouMean(k, TOP_KEYS)}`);
  }

  const style = raw.style == null ? 'clanker' : String(raw.style).toLowerCase();
  if (!['clanker', 'serious'].includes(style)) problems.push(`style must be "clanker" or "serious", not "${raw.style}".`);

  const title = raw.title == null ? null : String(raw.title);

  let overall = raw.overall == null ? 'average' : String(raw.overall).toLowerCase();
  if (!['average', 'none'].includes(overall)) {
    const c = resolveCategory(overall);
    if (c) overall = c;
    else problems.push(`overall must be "average", "none" or a category name, not "${raw.overall}".`);
  }

  const minShare = raw.min_share == null ? 2 : Number(raw.min_share);
  if (!Number.isFinite(minShare) || minShare < 0 || minShare > 50) problems.push('min_share must be a number between 0 and 50.');

  const merge = {};
  if (raw.merge != null) {
    if (typeof raw.merge !== 'object' || Array.isArray(raw.merge)) problems.push('merge should look like "merge: { cursor: claude }".');
    else for (const [from, to] of Object.entries(raw.merge)) {
      const f = resolveModel(from);
      const t = resolveModel(to);
      if (!f) problems.push(`merge: unknown AI "${from}".${didYouMean(from, allModelKeys())}`);
      if (!t) problems.push(`merge: unknown AI "${to}".${didYouMean(to, allModelKeys())}`);
      if (f && t) merge[f] = t;
    }
  }

  const categories = {};
  const rawCats = raw.categories == null ? DEFAULT_CATEGORIES : raw.categories;
  if (typeof rawCats !== 'object' || Array.isArray(rawCats)) {
    problems.push('categories should be a list like "code: auto".');
  } else {
    for (const [key, value] of Object.entries(rawCats)) {
      const id = resolveCategory(key);
      if (!id) { problems.push(`Unknown category "${key}".${didYouMean(key, allCategoryKeys())} Known: ${CATEGORIES.map((c) => c.id).join(', ')}.`); continue; }
      if (categories[id]) { problems.push(`Category "${key}" is listed twice.`); continue; }
      const cat = CATEGORIES.find((c) => c.id === id);
      if (value === false || value === 'off' || value === 'hide' || value === null) continue;
      if (value === 'auto' || value === true) {
        if (!cat.auto) problems.push(`"${key}" can't be measured from git. Write the shares by hand, e.g. "${id}: { human: 70, claude: 30 }".`);
        else categories[id] = { mode: 'auto' };
        continue;
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        problems.push(`${key}: expected "auto", "off" or shares like "{ claude: 60, human: 40 }", got "${value}".`);
        continue;
      }
      const shares = {};
      let estimated = false;
      for (const [model, share] of Object.entries(value)) {
        if (model === 'estimated') { estimated = share === true || share === 'true'; continue; }
        const m = resolveModel(model);
        if (!m) { problems.push(`${key}: unknown AI "${model}".${didYouMean(model, allModelKeys())} Run "clanker-index models" for the list, or use "other".`); continue; }
        const n = parseShare(share);
        if (!Number.isFinite(n) || n < 0) { problems.push(`${key}.${model}: "${share}" is not a percentage.`); continue; }
        shares[m] = (shares[m] || 0) + n;
      }
      const sum = Object.values(shares).reduce((a, b) => a + b, 0);
      if (sum > 100.5) warnings.push(`${key}: shares add up to ${sum}, so they were scaled down to 100%.`);
      if (sum < 99.5 && sum > 0 && shares.human == null) {
        warnings.push(`${key}: shares add up to ${sum}%, the remaining ${Math.round((100 - sum) * 10) / 10}% was counted as human.`);
        shares.human = 100 - sum;
      } else if (sum < 99.5 && sum > 0) {
        warnings.push(`${key}: shares add up to ${sum}, so they were scaled up to 100%.`);
      }
      if (sum === 0) { warnings.push(`${key}: all shares are 0, category hidden.`); continue; }
      categories[id] = { mode: 'manual', shares, estimated };
    }
  }

  const paths = { ignore: [], tests: [], docs: [] };
  if (raw.paths != null) {
    if (typeof raw.paths !== 'object' || Array.isArray(raw.paths)) problems.push('paths should look like "paths: { ignore: [generated/**] }".');
    else for (const [k, v] of Object.entries(raw.paths)) {
      if (!(k in paths)) { problems.push(`paths: unknown key "${k}". Use ignore, tests or docs.`); continue; }
      const list = Array.isArray(v) ? v : [v];
      paths[k] = list.map(String);
    }
  }

  if (problems.length) throw new ConfigError(problems);
  return { config: { style, title, overall, minShare, merge, categories, paths }, warnings };
}

export function loadConfig(file) {
  if (!existsSync(file)) return { ...normalizeConfig({}), missing: true };
  const text = readFileSync(file, 'utf8');
  const doc = YAML.parseDocument(text, { prettyErrors: true });
  if (doc.errors.length) {
    throw new ConfigError(doc.errors.map((e) => e.message.split('\n')[0] + ' (check indentation and colons)'));
  }
  return normalizeConfig(doc.toJS() ?? {});
}
