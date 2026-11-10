import { CATEGORIES } from './categories.js';

/** Round percentages so they always add up to exactly 100 (largest remainder). */
export function roundTo100(entries) {
  const total = entries.reduce((a, e) => a + e.value, 0);
  if (total <= 0) return [];
  const raw = entries.map((e) => ({ ...e, exact: (e.value / total) * 100 }));
  const floored = raw.map((e) => ({ ...e, p: Math.floor(e.exact) }));
  let left = 100 - floored.reduce((a, e) => a + e.p, 0);
  [...floored].sort((a, b) => (b.exact - b.p) - (a.exact - a.p)).forEach((e) => { if (left > 0) { e.p++; left--; } });
  return floored.filter((e) => e.p > 0).map(({ id, p }) => ({ id, p }));
}

/**
 * Turn raw numbers (lines, files or percentages) into what the badge shows:
 * AIs sorted largest first, small ones grouped as "other", human last.
 */
export function buildCategory(raw, { merge = {}, minShare = 2 } = {}) {
  const merged = {};
  for (const [id, v] of Object.entries(raw)) {
    const to = merge[id] || id;
    merged[to] = (merged[to] || 0) + v;
  }
  const total = Object.values(merged).reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const human = merged.human || 0;
  let ais = Object.entries(merged).filter(([id, v]) => id !== 'human' && v > 0).map(([id, value]) => ({ id, value }));
  const small = ais.filter((a) => a.id !== 'other' && (a.value / total) * 100 < minShare);
  if (small.length >= 2) {
    const otherValue = small.reduce((a, b) => a + b.value, 0);
    ais = ais.filter((a) => !small.includes(a));
    const existing = ais.find((a) => a.id === 'other');
    if (existing) existing.value += otherValue; else ais.push({ id: 'other', value: otherValue, members: small.map((s) => s.id) });
  }

  const rounded = roundTo100([...ais, ...(human > 0 ? [{ id: 'human', value: human }] : [])]);
  const humanP = rounded.find((r) => r.id === 'human')?.p || 0;
  const aiShares = rounded.filter((r) => r.id !== 'human').sort((a, b) => (a.id === 'other') - (b.id === 'other') || b.p - a.p);
  const shares = [...aiShares, ...(humanP ? [{ id: 'human', p: humanP }] : [])];
  return { ai: 100 - humanP, shares, otherMembers: small.length >= 2 ? small.map((s) => s.id) : [] };
}

/** Assemble everything the renderer needs. */
export function buildBadgeData(config, measured = {}) {
  const categories = [];
  for (const cat of CATEGORIES) {
    const c = config.categories[cat.id];
    if (!c) continue;
    const raw = c.mode === 'auto' ? measured[cat.id] || {} : c.shares;
    const built = buildCategory(raw, config);
    if (!built) continue;
    categories.push({ id: cat.id, label: cat.label, estimated: c.mode === 'manual' && c.estimated, ...built });
  }
  let overall = null;
  if (config.overall === 'average' && categories.length) {
    overall = Math.round(categories.reduce((a, c) => a + c.ai, 0) / categories.length);
  } else if (config.overall !== 'none') {
    overall = categories.find((c) => c.id === config.overall)?.ai ?? null;
  }
  return { title: config.title, overall, categories };
}
