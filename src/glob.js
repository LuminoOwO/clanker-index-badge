// Tiny glob matcher: `**` (any depth), `*` (within a path segment), `?`.
// A pattern without a slash matches the file name at any depth.

const cache = new Map();

export function globToRegExp(glob) {
  if (cache.has(glob)) return cache.get(glob);
  let g = glob.replace(/^\.\//, '');
  if (!g.includes('/')) g = '**/' + g;
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i++;
        if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const out = new RegExp('^' + re + '$');
  cache.set(glob, out);
  return out;
}

export function matchesAny(path, globs) {
  return globs.some((g) => globToRegExp(g).test(path));
}
