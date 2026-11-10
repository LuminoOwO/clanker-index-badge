// Every AI the badge knows, with its signature colors.
//
// A color is one of:
//   '#RRGGBB'                       solid, same in light and dark mode
//   { light: '#…', dark: '#…' }     solid, different per theme
//   { gradient: ['#…', '#…', …] }   left-to-right gradient
//   { pattern: 'h'|'v'|'d'|'d2'|'dots'|'checker' }
//                                   for black/white brands: dark-on-gray in
//                                   light mode, light-on-gray in dark mode
//   'mono'                          solid black in light mode, near-white in dark
//
// `match` is tested against commit authors and Co-Authored-By lines
// (lowercased "name <email>") to detect AI commits automatically.
//
// Colors are approximations of each brand. Corrections welcome: edit this
// file, nothing else needs to change.

export const MODELS = [
  // ── Models ──────────────────────────────────────────────────────────────
  { id: 'claude', name: 'Claude', vendor: 'Anthropic', group: 'model', color: '#D97757', aliases: ['anthropic', 'claude-code', 'claude code'], match: /claude|anthropic/ },
  { id: 'chatgpt', name: 'ChatGPT', vendor: 'OpenAI', group: 'model', color: '#10A37F', aliases: ['openai', 'gpt', 'chat-gpt', 'gpt-4', 'gpt-4o', 'gpt-5'], match: /chatgpt|openai|\bgpt/ },
  { id: 'codex', name: 'Codex', vendor: 'OpenAI', group: 'model', color: { light: '#0D6E57', dark: '#5BD0A8' }, aliases: ['openai-codex', 'codex-cli'], match: /codex/ },
  { id: 'gemini', name: 'Gemini', vendor: 'Google', group: 'model', color: { gradient: ['#4285F4', '#9B72CB', '#D96570'] }, aliases: ['google', 'bard', 'jules', 'gemini-cli', 'gemini-code-assist'], match: /gemini|jules|google-labs/ },
  { id: 'gemma', name: 'Gemma', vendor: 'Google', group: 'model', color: '#8AB4F8', aliases: [], match: /gemma/ },
  { id: 'grok', name: 'Grok', vendor: 'xAI', group: 'model', color: 'mono', aliases: ['xai', 'x.ai'], match: /grok|\bx\.ai\b|\bxai\b/ },
  { id: 'llama', name: 'Llama', vendor: 'Meta', group: 'model', color: '#33A1FD', aliases: ['meta', 'meta-ai', 'llama-3', 'llama-4'], match: /llama|meta-ai/ },
  { id: 'deepseek', name: 'DeepSeek', vendor: 'DeepSeek', group: 'model', color: '#4D6BFE', aliases: ['deep-seek'], match: /deepseek/ },
  { id: 'qwen', name: 'Qwen', vendor: 'Alibaba', group: 'model', color: '#615CED', aliases: ['alibaba', 'qwen-code'], match: /qwen/ },
  { id: 'mistral', name: 'Mistral', vendor: 'Mistral AI', group: 'model', color: '#FA520F', aliases: ['codestral', 'devstral', 'mistral-ai', 'le-chat'], match: /mistral|codestral|devstral/ },
  { id: 'kimi', name: 'Kimi', vendor: 'Moonshot AI', group: 'model', color: { pattern: 'h' }, aliases: ['moonshot'], match: /kimi|moonshot/ },
  { id: 'glm', name: 'GLM', vendor: 'Z.ai', group: 'model', color: { pattern: 'v' }, aliases: ['zhipu', 'z.ai', 'zai'], match: /\bglm|zhipu|\bz\.ai\b/ },
  { id: 'minimax', name: 'MiniMax', vendor: 'MiniMax', group: 'model', color: '#F23F5D', aliases: [], match: /minimax/ },
  { id: 'command', name: 'Command', vendor: 'Cohere', group: 'model', color: { light: '#39594D', dark: '#7FA393' }, aliases: ['cohere', 'command-r'], match: /cohere/ },
  { id: 'phi', name: 'Phi', vendor: 'Microsoft', group: 'model', color: '#0078D4', aliases: ['microsoft-phi'], match: /\bphi-\d/ },
  { id: 'nova', name: 'Nova', vendor: 'Amazon', group: 'model', color: '#FF9900', aliases: ['amazon-nova'], match: /amazon nova|amazon-nova/ },
  { id: 'sonar', name: 'Sonar', vendor: 'Perplexity', group: 'model', color: '#20808D', aliases: ['perplexity'], match: /perplexity/ },
  { id: 'granite', name: 'Granite', vendor: 'IBM', group: 'model', color: '#0F62FE', aliases: ['ibm', 'ibm-granite'], match: /granite/ },
  { id: 'nemotron', name: 'Nemotron', vendor: 'NVIDIA', group: 'model', color: '#76B900', aliases: ['nvidia'], match: /nemotron/ },
  { id: 'ernie', name: 'ERNIE', vendor: 'Baidu', group: 'model', color: '#2932E1', aliases: ['baidu'], match: /\bernie\b/ },

  // ── Agents and coding tools ─────────────────────────────────────────────
  { id: 'copilot', name: 'GitHub Copilot', vendor: 'GitHub', group: 'tool', color: '#8957E5', aliases: ['github-copilot', 'copilot-agent'], match: /copilot/ },
  { id: 'cursor', name: 'Cursor', vendor: 'Anysphere', group: 'tool', color: { pattern: 'd' }, aliases: ['cursor-agent'], match: /cursor/ },
  { id: 'windsurf', name: 'Windsurf', vendor: 'Cognition', group: 'tool', color: '#09B6A2', aliases: ['codeium'], match: /windsurf|codeium/ },
  { id: 'devin', name: 'Devin', vendor: 'Cognition', group: 'tool', color: { pattern: 'checker' }, aliases: [], match: /devin/ },
  { id: 'v0', name: 'v0', vendor: 'Vercel', group: 'tool', color: { pattern: 'dots' }, aliases: ['vercel'], match: /\bv0\b/ },
  { id: 'aider', name: 'Aider', vendor: 'open source', group: 'tool', color: '#14B014', aliases: [], match: /aider/ },
  { id: 'cline', name: 'Cline', vendor: 'open source', group: 'tool', color: { pattern: 'd2' }, aliases: ['roo', 'roo-code'], match: /\bcline\b|roo-?code/ },
  { id: 'replit', name: 'Replit Agent', vendor: 'Replit', group: 'tool', color: '#F26207', aliases: ['replit-agent'], match: /replit/ },
  { id: 'lovable', name: 'Lovable', vendor: 'Lovable', group: 'tool', color: { gradient: ['#FF8A00', '#FF3D77', '#7B61FF'] }, aliases: [], match: /lovable/ },
  { id: 'bolt', name: 'Bolt', vendor: 'StackBlitz', group: 'tool', color: '#1389FD', aliases: ['bolt.new', 'stackblitz'], match: /bolt\.new|stackblitz/ },
  { id: 'jetbrains', name: 'JetBrains AI', vendor: 'JetBrains', group: 'tool', color: { gradient: ['#FF318C', '#6B57FF'] }, aliases: ['jetbrains-ai', 'junie'], match: /junie|jetbrains/ },
  { id: 'kiro', name: 'Kiro', vendor: 'AWS', group: 'tool', color: { light: '#790ECB', dark: '#A855F7' }, aliases: ['amazon-q', 'q-developer'], match: /kiro|amazon q/ },
  { id: 'coderabbit', name: 'CodeRabbit', vendor: 'CodeRabbit', group: 'tool', color: '#FF570A', aliases: [], match: /coderabbit/ },
  { id: 'deepl', name: 'DeepL', vendor: 'DeepL', group: 'tool', color: { light: '#0F2B46', dark: '#7FB2E5' }, aliases: [], match: /deepl/ },

  // ── Images ──────────────────────────────────────────────────────────────
  { id: 'midjourney', name: 'Midjourney', vendor: 'Midjourney', group: 'image', color: 'mono', aliases: ['mj'] },
  { id: 'gpt-image', name: 'GPT Image', vendor: 'OpenAI', group: 'image', color: '#10A37F', aliases: ['dall-e', 'dalle', 'dall-e-3', 'gpt-image-1'] },
  { id: 'nano-banana', name: 'Nano Banana', vendor: 'Google', group: 'image', color: '#FBBC04', aliases: ['imagen', 'gemini-image'] },
  { id: 'flux', name: 'Flux', vendor: 'Black Forest Labs', group: 'image', color: { pattern: 'v' }, aliases: ['black-forest-labs', 'bfl'] },
  { id: 'stable-diffusion', name: 'Stable Diffusion', vendor: 'Stability AI', group: 'image', color: '#9D4EDD', aliases: ['sd', 'sdxl', 'stability', 'stability-ai'] },
  { id: 'firefly', name: 'Firefly', vendor: 'Adobe', group: 'image', color: '#FA0F00', aliases: ['adobe-firefly', 'adobe'] },
  { id: 'ideogram', name: 'Ideogram', vendor: 'Ideogram', group: 'image', color: { pattern: 'dots' }, aliases: [] },

  // ── Video ───────────────────────────────────────────────────────────────
  { id: 'sora', name: 'Sora', vendor: 'OpenAI', group: 'video', color: '#4FC3A1', aliases: [] },
  { id: 'veo', name: 'Veo', vendor: 'Google', group: 'video', color: '#4285F4', aliases: [] },
  { id: 'runway', name: 'Runway', vendor: 'Runway', group: 'video', color: 'mono', aliases: ['runwayml', 'gen-3', 'gen-4'] },
  { id: 'kling', name: 'Kling', vendor: 'Kuaishou', group: 'video', color: '#FF5000', aliases: ['kuaishou'] },
  { id: 'pika', name: 'Pika', vendor: 'Pika', group: 'video', color: '#FF4FB3', aliases: [] },
  { id: 'dream-machine', name: 'Dream Machine', vendor: 'Luma AI', group: 'video', color: { pattern: 'd' }, aliases: ['luma', 'luma-ai', 'ray'] },
  { id: 'hailuo', name: 'Hailuo', vendor: 'MiniMax', group: 'video', color: '#F23F5D', aliases: [] },
  { id: 'seedance', name: 'Seedance', vendor: 'ByteDance', group: 'video', color: '#3370FF', aliases: ['bytedance'] },

  // ── Audio and music ─────────────────────────────────────────────────────
  { id: 'suno', name: 'Suno', vendor: 'Suno', group: 'audio', color: 'mono', aliases: [] },
  { id: 'udio', name: 'Udio', vendor: 'Udio', group: 'audio', color: '#FF2D55', aliases: [] },
  { id: 'elevenlabs', name: 'ElevenLabs', vendor: 'ElevenLabs', group: 'audio', color: { pattern: 'h' }, aliases: ['eleven-labs', '11labs'] },
  { id: 'stable-audio', name: 'Stable Audio', vendor: 'Stability AI', group: 'audio', color: '#9D4EDD', aliases: [] },
  { id: 'lyria', name: 'Lyria', vendor: 'Google', group: 'audio', color: '#34A853', aliases: [] },
  { id: 'musicgen', name: 'MusicGen', vendor: 'Meta', group: 'audio', color: '#33A1FD', aliases: ['audiocraft'] },
];

// Not AIs, but part of every chart.
export const SPECIAL = {
  human: { id: 'human', name: 'Human', clankerName: 'meatbag', aliases: ['humans', 'me', 'manual', 'meatbag', 'people', 'person'] },
  other: { id: 'other', name: 'Other', clankerName: 'other clankers', aliases: ['others', 'misc', 'unknown-ai'] },
};

// Bots that commit but are neither human nor AI. Their commits are ignored.
export const IGNORED_BOTS = /dependabot|renovate|github-actions|semantic-release|greenkeeper|snyk-bot|pre-commit-ci|mergify|allcontributors/;

const norm = (s) => String(s).toLowerCase().trim().replace(/[\s_]+/g, '-');

const BY_KEY = new Map();
for (const m of MODELS) {
  BY_KEY.set(norm(m.id), m.id);
  BY_KEY.set(norm(m.name), m.id);
  for (const a of m.aliases) BY_KEY.set(norm(a), m.id);
}
for (const s of Object.values(SPECIAL)) {
  BY_KEY.set(s.id, s.id);
  for (const a of s.aliases) BY_KEY.set(norm(a), s.id);
}

export const MODEL_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

/** Resolve whatever the user typed ("Claude", "github copilot", "DALL-E") to an id, or null. */
export function resolveModel(input) {
  return BY_KEY.get(norm(input)) ?? null;
}

/** All accepted spellings, for "did you mean" suggestions. */
export function allModelKeys() {
  return [...BY_KEY.keys()];
}

/** Detect an AI from a commit identity string such as "Claude <noreply@anthropic.com>". */
export function detectAI(identity) {
  const s = String(identity).toLowerCase();
  if (IGNORED_BOTS.test(s)) return null;
  for (const m of DETECT_ORDER) if (m.match.test(s)) return m.id;
  return null;
}

// Tools first ("Codex <…@openai.com>" is Codex, not ChatGPT), then models.
const DETECT_ORDER = [
  ...MODELS.filter((m) => m.match && (m.group === 'tool' || m.id === 'codex')),
  ...MODELS.filter((m) => m.match && m.group !== 'tool' && m.id !== 'codex'),
];

export function displayName(id, style) {
  if (SPECIAL[id]) return style === 'clanker' ? SPECIAL[id].clankerName : SPECIAL[id].name;
  const m = MODEL_BY_ID.get(id);
  const name = m ? m.name : id;
  if (style !== 'clanker') return name;
  return id === 'copilot' ? 'copilot' : name.toLowerCase();
}
