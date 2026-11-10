// The parts of a project the badge can measure, in display order.
// `auto` = can be computed from git history.

export const CATEGORIES = [
  { id: 'code', label: 'Code', auto: true, aliases: ['source', 'src', 'programming'] },
  { id: 'bugfix', label: 'Bug fixing', auto: true, aliases: ['bug', 'bugs', 'bug-fixing', 'bugfixing', 'fixes', 'fix', 'debugging'] },
  { id: 'tests', label: 'Tests', auto: true, aliases: ['test', 'testing', 'specs'] },
  { id: 'docs', label: 'Docs', auto: true, aliases: ['doc', 'documentation', 'readme', 'writing'] },
  { id: 'review', label: 'Code review', auto: false, aliases: ['code-review', 'reviews', 'pr-review'] },
  { id: 'translations', label: 'Translations', auto: false, aliases: ['translation', 'i18n', 'l10n', 'localization'] },
  { id: 'ideas', label: 'Ideas & design', auto: false, aliases: ['idea', 'design', 'ideas-design', 'ideas-and-design', 'concept', 'planning'] },
  { id: 'images', label: 'Images', auto: true, aliases: ['image', 'art', 'graphics', 'media', 'media-and-images', 'pictures'] },
  { id: 'audio', label: 'Audio', auto: true, aliases: ['music', 'sound', 'sfx', 'voice'] },
  { id: 'video', label: 'Video', auto: true, aliases: ['videos', 'animation', 'film'] },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

const KEY = new Map();
for (const c of CATEGORIES) {
  KEY.set(c.id, c.id);
  KEY.set(c.label.toLowerCase().replace(/\s*&\s*/g, '-').replace(/\s+/g, '-'), c.id);
  for (const a of c.aliases) KEY.set(a, c.id);
}

export function resolveCategory(input) {
  return KEY.get(String(input).toLowerCase().trim().replace(/[\s_]+/g, '-')) ?? null;
}

export function allCategoryKeys() {
  return [...KEY.keys()];
}

// Default file classification for the auto categories.
export const DEFAULT_PATHS = {
  ignore: [
    '.clanker/**', '**/node_modules/**', '**/vendor/**', '**/dist/**', '**/build/**', '**/out/**',
    '**/*.min.*', '**/*.map', '**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml', '**/bun.lockb',
    '**/Cargo.lock', '**/poetry.lock', '**/composer.lock', '**/Gemfile.lock', '**/go.sum', '**/*.lock',
    '**/LICENSE', '**/LICENSE.*', '**/.gitignore', '**/.gitattributes',
  ],
  tests: [
    '**/test/**', '**/tests/**', '**/__tests__/**', '**/spec/**', '**/*.test.*', '**/*.spec.*',
    '**/*_test.*', '**/test_*.py', '**/*Test.java', '**/*Tests.cs',
  ],
  docs: ['docs/**', 'doc/**', '**/*.md', '**/*.mdx', '**/*.rst', '**/*.adoc', '**/*.txt'],
};

const EXT = {
  images: 'png jpg jpeg gif webp avif svg bmp tif tiff psd ico heic heif xcf kra aseprite',
  audio: 'mp3 wav ogg oga flac m4a aac opus mid midi aiff aif wma',
  video: 'mp4 mov webm mkv avi m4v wmv flv mpg mpeg',
  binary: 'ttf otf woff woff2 eot zip gz tgz tar 7z rar xz bz2 pdf exe dll so dylib bin jar class wasm o a lib pyc db sqlite blend fbx glb gltf obj unitypackage',
};
const EXT_KIND = new Map();
for (const [kind, list] of Object.entries(EXT)) for (const e of list.split(' ')) EXT_KIND.set(e, kind);

/** 'images' | 'audio' | 'video' | 'binary' | 'text' */
export function fileKind(path) {
  const m = /\.([^./]+)$/.exec(path.toLowerCase());
  return (m && EXT_KIND.get(m[1])) || 'text';
}
