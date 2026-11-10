import { MODEL_BY_ID, displayName } from './palette.js';

const W = 840;

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
  const head = style === 'clanker' ? 'Clanker Index' : 'AI contribution by category';
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

function renderSerious(data, theme) {
  const t = THEMES.serious[theme];
  const fills = new Fills(theme, 'serious');
  const P = 24;
  const out = [];
  let y = P;

  out.push(`<text x="${P}" y="${y + 18}" font-size="18" font-weight="600" fill="${t.text}">${esc(data.title || 'AI contribution by category')}</text>`);
  if (data.overall != null) {
    out.push(`<text x="${W - P}" y="${y + 18}" text-anchor="end" font-size="14" fill="${t.muted}"><tspan font-size="20" font-weight="700" fill="${t.text}">${data.overall}%</tspan> AI overall</text>`);
  }
  y += 34;
  out.push(`<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="${t.divider}"/>`);
  y += 18;

  const bx = P + 144;
  const bw = W - P - 78 - bx;
  data.categories.forEach((cat, ci) => {
    out.push(`<text x="${P}" y="${y + 11}" font-size="14" font-weight="600" fill="${t.text}">${esc(cat.label)}</text>`);
    out.push(`<clipPath id="c${ci}"><rect x="${bx}" y="${y + 2}" width="${bw}" height="10" rx="5"/></clipPath><g clip-path="url(#c${ci})">`);
    for (const s of segments(cat.shares, bx, bw, 2)) out.push(`<rect x="${s.x.toFixed(2)}" y="${y + 2}" width="${s.w.toFixed(2)}" height="10" fill="${fills.get(s.id).fill}"/>`);
    out.push('</g>');
    out.push(`<text x="${W - P}" y="${y + 12}" text-anchor="end" font-size="14" font-weight="700" fill="${t.text}">${cat.estimated ? '~' : ''}${cat.ai}% AI</text>`);

    let cx = bx;
    let cy = y + 32;
    for (const s of cat.shares) {
      const name = displayName(s.id, 'serious');
      const w = 13 + sansWidth(name, 12, true) + 4 + sansWidth(`${s.p}%`, 12);
      if (cx + w > W - P && cx > bx) { cx = bx; cy += 18; }
      out.push(`<rect x="${cx}" y="${cy - 9}" width="9" height="9" rx="2" fill="${fills.get(s.id).fill}"/>`);
      out.push(`<text x="${cx + 13}" y="${cy}" font-size="12" fill="${t.muted}"><tspan font-weight="600" fill="${t.text}">${esc(name)}</tspan> ${s.p}%</text>`);
      cx += w + 14;
    }
    y = cy + 22;
  });

  y += 2;
  out.push(`<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="${t.divider}"/>`);
  const note = data.categories.some((c) => c.estimated) ? '~ estimated · ' : '';
  out.push(`<text x="${P}" y="${y + 20}" font-size="11" fill="${t.muted}">${note}clanker-index-badge</text>`);
  return wrap('serious', theme, y + 34, out, fills, data);
}

function renderClanker(data, theme) {
  const t = THEMES.clanker[theme];
  const fills = new Fills(theme, 'clanker');
  const P = 24;
  const out = [];
  let y = P;

  out.push(`<text x="${P}" y="${y + 20}" font-size="20" font-weight="800" letter-spacing="1" fill="${t.text}">${esc((data.title || 'Clanker Index').toUpperCase())}</text>`);
  if (data.overall != null) {
    out.push(`<text x="${W - P}" y="${y + 20}" text-anchor="end" font-size="14" fill="${t.muted}"><tspan font-size="22" font-weight="800" fill="${t.accent}">${data.overall}%</tspan> clanker overall</text>`);
  }
  y += 34;
  out.push(`<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="${t.divider}" stroke-width="2" stroke-dasharray="6 4"/>`);
  y += 16;

  data.categories.forEach((cat) => {
    const label = cat.label.toUpperCase();
    const pct = `${cat.estimated ? '~' : ''}${cat.ai}%`;
    const labelEnd = P + monoWidth(label, 13, 1);
    const rightStart = W - P - monoWidth(pct + ' clanker', 13);
    out.push(`<text x="${P}" y="${y + 13}" font-size="13" font-weight="700" letter-spacing="1" fill="${t.text}">${esc(label)}</text>`);
    if (rightStart - labelEnd > 24) {
      out.push(`<line x1="${(labelEnd + 10).toFixed(1)}" y1="${y + 9}" x2="${(rightStart - 10).toFixed(1)}" y2="${y + 9}" stroke="${t.divider}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>`);
    }
    out.push(`<text x="${W - P}" y="${y + 13}" text-anchor="end" font-size="13" fill="${t.muted}"><tspan font-weight="800" fill="${t.accent}">${pct}</tspan> clanker</text>`);

    const by = y + 22;
    for (const s of segments(cat.shares, P, W - 2 * P, 2)) {
      const f = fills.get(s.id);
      out.push(`<rect x="${s.x.toFixed(2)}" y="${by}" width="${s.w.toFixed(2)}" height="26" rx="2" fill="${f.fill}"/>`);
      const text = `${displayName(s.id, 'clanker')} ${s.p}%`;
      const tw = monoWidth(text, 11);
      if (tw + 16 <= s.w) {
        if (f.chip) out.push(`<rect x="${(s.x + 5).toFixed(2)}" y="${by + 6}" width="${(tw + 8).toFixed(1)}" height="14" rx="2" fill="${f.chip}"/>`);
        out.push(`<text x="${(s.x + 9).toFixed(2)}" y="${by + 17}" font-size="11" font-weight="700" fill="${f.text}">${esc(text)}</text>`);
      }
    }
    y = by + 26 + 16;

    const hidden = segments(cat.shares, P, W - 2 * P, 2).filter((s) => monoWidth(`${displayName(s.id, 'clanker')} ${s.p}%`, 11) + 16 > s.w);
    if (hidden.length) {
      let cx = P;
      for (const s of hidden) {
        const name = displayName(s.id, 'clanker');
        const w = 13 + monoWidth(`${name} ${s.p}%`, 11);
        if (cx + w > W - P && cx > P) { cx = P; y += 16; }
        out.push(`<rect x="${cx}" y="${y - 8}" width="9" height="9" fill="${fills.get(s.id).fill}"/>`);
        out.push(`<text x="${cx + 13}" y="${y}" font-size="11" fill="${t.muted}"><tspan fill="${t.text}">${esc(name)}</tspan> ${s.p}%</text>`);
        cx += w + 16;
      }
      y += 18;
    }
  });

  const note = data.categories.some((c) => c.estimated) ? '~ estimated · ' : '';
  out.push(`<text x="${P}" y="${y + 6}" font-size="11" fill="${t.muted}">&gt; ${note}clanker-index-badge</text>`);
  return wrap('clanker', theme, y + 24, out, fills, data);
}

/** Render one badge. style: 'clanker' | 'serious', theme: 'light' | 'dark'. */
export function render(data, style, theme) {
  if (!data.categories.length) return emptyState(style, theme, data);
  return style === 'clanker' ? renderClanker(data, theme) : renderSerious(data, theme);
}
