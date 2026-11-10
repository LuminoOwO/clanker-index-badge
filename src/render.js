import { MODEL_BY_ID, displayName } from './palette.js';

const W = 720;

const THEMES = {
  serious: {
    light: { bg: '#ffffff', border: '#d0d7de', text: '#1f2328', muted: '#59636e', divider: '#d8dee4', accent: '#1f2328' },
    dark: { bg: '#161b22', border: '#3d444d', text: '#e6edf3', muted: '#9198a1', divider: '#3d444d', accent: '#e6edf3' },
  },
  clanker: {
    light: { bg: '#ffffff', border: '#d0d7de', text: '#1f2328', muted: '#59636e', divider: '#d0d7de', accent: '#9A6700' },
    dark: { bg: '#161b22', border: '#3d444d', text: '#e6edf3', muted: '#9198a1', divider: '#3d444d', accent: '#F5C518' },
  },
};

const FONT = {
  serious: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
  clanker: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Rough text widths, so layout works without loading fonts.
function sansWidth(str, size, bold = false) {
  let w = 0;
  for (const ch of String(str)) {
    if ('il.,:;!|\'’ '.includes(ch)) w += 0.28;
    else if ('fjrt()[]-'.includes(ch)) w += 0.36;
    else if ('mwMW%@'.includes(ch)) w += 0.86;
    else if (/[A-Z]/.test(ch)) w += 0.66;
    else if (/[0-9]/.test(ch)) w += 0.56;
    else w += 0.54;
  }
  return w * size * (bold ? 1.06 : 1);
}
const monoWidth = (str, size, letterSpacing = 0) => String(str).length * (size * 0.6 + letterSpacing);

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const readableOn = (hex) => ((luminance(hex) + 0.05) / 0.05 >= 1.05 / (luminance(hex) + 0.05) ? '#111111' : '#ffffff');

// Collects <defs> (gradients and patterns) and hands out fill references.
class Fills {
  constructor(theme, style) {
    this.theme = theme;
    this.style = style;
    this.defs = [];
    this.ids = new Map();
  }

  spec(id) {
    const dark = this.theme === 'dark';
    if (id === 'human') {
      if (this.style === 'clanker') return '#F2B8A0';
      return { pattern: 'hatch' };
    }
    if (id === 'other') return dark ? '#8b949e' : '#8c959f';
    const c = MODEL_BY_ID.get(id)?.color ?? '#8c959f';
    if (c === 'mono') return dark ? '#E7E7E7' : '#111111';
    if (typeof c === 'object' && c.light) return dark ? c.dark : c.light;
    return c;
  }

  /** { fill, text, chip } — chip is a background to put behind labels on busy fills. */
  get(id) {
    const s = this.spec(id);
    if (typeof s === 'string') return { fill: s, text: readableOn(s), chip: null };
    const key = JSON.stringify(s);
    if (!this.ids.has(key)) {
      const ref = 'f' + this.ids.size;
      this.ids.set(key, ref);
      this.defs.push(s.gradient ? this.gradient(ref, s.gradient) : this.pattern(ref, s.pattern));
    }
    const fill = `url(#${this.ids.get(key)})`;
    if (s.gradient) return { fill, text: '#ffffff', chip: null };
    const dark = this.theme === 'dark';
    return { fill, text: dark ? '#111111' : '#ffffff', chip: dark ? '#E7E7E7' : '#111111' };
  }

  gradient(ref, stops) {
    const st = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
    return `<linearGradient id="${ref}" x1="0" y1="0" x2="1" y2="0">${st}</linearGradient>`;
  }

  pattern(ref, kind) {
    const dark = this.theme === 'dark';
    if (kind === 'hatch') {
      const fg = '#8c959f';
      const bg = dark ? '#3d444d' : '#d0d7de';
      return `<pattern id="${ref}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${bg}"/><rect width="2" height="4" fill="${fg}"/></pattern>`;
    }
    const fg = dark ? '#E7E7E7' : '#111111';
    const bg = dark ? '#6e7681' : '#6e7781';
    if (kind === 'dots') {
      const dbg = dark ? '#30363d' : '#c9d1d9';
      return `<pattern id="${ref}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${dbg}"/><circle cx="3" cy="3" r="1.6" fill="${fg}"/></pattern>`;
    }
    if (kind === 'checker') {
      return `<pattern id="${ref}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${bg}"/><rect width="4" height="4" fill="${fg}"/><rect x="4" y="4" width="4" height="4" fill="${fg}"/></pattern>`;
    }
    const angle = { v: 0, h: 90, d: 45, d2: -45 }[kind] ?? 45;
    return `<pattern id="${ref}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="6" height="6" fill="${bg}"/><rect width="3" height="6" fill="${fg}"/></pattern>`;
  }
}

function segments(shares, x, width, gap) {
  const n = shares.length;
  const avail = width - gap * (n - 1);
  const total = shares.reduce((a, s) => a + s.p, 0);
  let cx = x;
  return shares.map((s, i) => {
    const w = i === n - 1 ? x + width - cx : Math.max(1, (s.p / total) * avail);
    const seg = { ...s, x: cx, w };
    cx += w + gap;
    return seg;
  });
}

function describe(data, style) {
  const parts = data.categories.map((c) => `${c.label}: ${c.ai}% AI (${c.shares.map((s) => `${displayName(s.id, 'serious')} ${s.p}%`).join(', ')})`);
  const head = style === 'clanker' ? 'Clanker Index' : 'AI contribution';
  return `${head}${data.overall != null ? `, ${data.overall}% AI overall` : ''}. ${parts.join('; ')}.`;
}

function wrap(style, theme, height, body, fills, data) {
  const t = THEMES[style][theme];
  const sw = style === 'clanker' ? 2 : 1;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="t">`,
    `<title id="t">${esc(describe(data, style))}</title>`,
    fills.defs.length ? `<defs>${fills.defs.join('')}</defs>` : '',
    `<rect x="${sw / 2}" y="${sw / 2}" width="${W - sw}" height="${height - sw}" rx="${style === 'clanker' ? 10 : 8}" fill="${t.bg}" stroke="${t.border}" stroke-width="${sw}"/>`,
    `<g font-family="${FONT[style]}">`,
    ...body,
    '</g>',
    '</svg>',
  ].join('\n');
}

function emptyState(style, theme, data) {
  const t = THEMES[style][theme];
  const fills = new Fills(theme, style);
  const body = [`<text x="24" y="44" font-size="14" fill="${t.muted}">No data yet. Commit something, or add shares to .clanker.yml.</text>`];
  return wrap(style, theme, 72, body, fills, data);
}

// One line per category: label in front, bar in the middle, % at the end.
// Names and percentages sit inside the bar where they fit; one shared color
// key at the bottom names every AI.
function compactRows({ data, theme, style, fills, t, out, y, P }) {
  const clanker = style === 'clanker';
  const labelOf = (c) => (clanker ? c.label.toUpperCase() : c.label);
  const labelWidth = (s) => (clanker ? monoWidth(s, 12, 1) : sansWidth(s, 13, true));
  const textWidth = (s) => (clanker ? monoWidth(s, 11) : sansWidth(s, 11, true));
  const pctText = (c) => `${c.estimated ? '~' : ''}${c.ai}%${clanker ? '' : ' AI'}`;

  const labelW = Math.ceil(Math.max(...data.categories.map((c) => labelWidth(labelOf(c))))) + 14;
  const pctW = Math.ceil(Math.max(...data.categories.map((c) => (clanker ? monoWidth(pctText(c), 13) : sansWidth(pctText(c), 13, true))))) + 12;
  const bx = P + labelW;
  const bw = W - P - pctW - bx;
  const barH = clanker ? 22 : 18;
  const pitch = barH + 8;

  data.categories.forEach((cat, ci) => {
    const mid = y + barH / 2;
    out.push(`<text x="${P}" y="${mid + 4.5}" font-size="${clanker ? 12 : 13}" font-weight="${clanker ? 700 : 600}"${clanker ? ' letter-spacing="1"' : ''} fill="${t.text}">${esc(labelOf(cat))}</text>`);
    if (!clanker) out.push(`<clipPath id="c${ci}"><rect x="${bx}" y="${y}" width="${bw}" height="${barH}" rx="4"/></clipPath><g clip-path="url(#c${ci})">`);
    for (const s of segments(cat.shares, bx, bw, 2)) {
      const f = fills.get(s.id);
      out.push(`<rect x="${s.x.toFixed(2)}" y="${y}" width="${s.w.toFixed(2)}" height="${barH}"${clanker ? ' rx="2"' : ''} fill="${f.fill}"/>`);
      const full = `${displayName(s.id, style)} ${s.p}%`;
      const label = textWidth(full) + 12 <= s.w ? full : textWidth(`${s.p}%`) + 10 <= s.w ? `${s.p}%` : null;
      if (!label) continue;
      const tw = textWidth(label);
      if (f.chip) out.push(`<rect x="${(s.x + 3).toFixed(2)}" y="${mid - 7}" width="${(tw + 6).toFixed(1)}" height="14" rx="2" fill="${f.chip}"/>`);
      out.push(`<text x="${(s.x + 6).toFixed(2)}" y="${mid + 4}" font-size="11" font-weight="${clanker ? 700 : 600}" fill="${f.text}">${esc(label)}</text>`);
    }
    if (!clanker) out.push('</g>');
    out.push(`<text x="${W - P}" y="${mid + 4.5}" text-anchor="end" font-size="13" font-weight="${clanker ? 800 : 700}" fill="${t.accent}">${pctText(cat)}</text>`);
    y += pitch;
  });

  // Shared color key.
  y += 4;
  out.push(`<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="${t.divider}"${clanker ? ' stroke-width="2" stroke-dasharray="6 4"' : ''}/>`);
  y += 18;
  const seen = [];
  for (const c of data.categories) for (const s of c.shares) if (!seen.includes(s.id)) seen.push(s.id);
  const ai = seen.filter((id) => id !== 'human' && id !== 'other');
  const keys = [...ai, ...seen.filter((id) => id === 'other'), ...seen.filter((id) => id === 'human')];
  const credit = `${data.categories.some((c) => c.estimated) ? '~ estimated · ' : ''}clanker-index-badge`;
  const creditW = clanker ? monoWidth('> ' + credit, 10) : sansWidth(credit, 10);
  let cx = P;
  for (const id of keys) {
    const name = displayName(id, style);
    const w = 13 + textWidth(name);
    if (cx + w > W - P && cx > P) { cx = P; y += 17; }
    out.push(`<rect x="${cx}" y="${y - 8.5}" width="9" height="9" rx="${clanker ? 0 : 2}" fill="${fills.get(id).fill}"/>`);
    out.push(`<text x="${cx + 13}" y="${y}" font-size="11" fill="${t.muted}">${esc(name)}</text>`);
    cx += w + 14;
  }
  if (cx + creditW > W - P) y += 17;
  out.push(`<text x="${W - P}" y="${y}" text-anchor="end" font-size="10" fill="${t.muted}">${clanker ? '&gt; ' : ''}${esc(credit)}</text>`);
  return y;
}

function header({ data, style, t, out, P }) {
  const clanker = style === 'clanker';
  const title = data.title || (clanker ? 'Clanker Index' : 'AI contribution');
  out.push(clanker
    ? `<text x="${P}" y="${P + 13}" font-size="15" font-weight="800" letter-spacing="1" fill="${t.text}">${esc(title.toUpperCase())}</text>`
    : `<text x="${P}" y="${P + 13}" font-size="15" font-weight="600" fill="${t.text}">${esc(title)}</text>`);
  if (data.overall != null) {
    out.push(`<text x="${W - P}" y="${P + 13}" text-anchor="end" font-size="12" fill="${t.muted}"><tspan font-size="17" font-weight="800" fill="${t.accent}">${data.overall}%</tspan> ${clanker ? 'clanker' : 'AI'} overall</text>`);
  }
  return P + 28;
}

function renderStyle(data, theme, style) {
  const t = THEMES[style][theme];
  const fills = new Fills(theme, style);
  const P = 16;
  const out = [];
  const y = header({ data, style, t, out, P });
  const end = compactRows({ data, theme, style, fills, t, out, y, P });
  return wrap(style, theme, end + P - 2, out, fills, data);
}

/** Render one badge. style: 'clanker' | 'serious', theme: 'light' | 'dark'. */
export function render(data, style, theme) {
  if (!data.categories.length) return emptyState(style, theme, data);
  return renderStyle(data, theme, style);
}
