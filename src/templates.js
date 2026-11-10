export const ACTION_REF = 'LuminoOwO/clanker-index-badge@v1';

export const EXAMPLE_CONFIG = `# Clanker Index Badge: https://github.com/LuminoOwO/clanker-index-badge
#
# The only file you edit. The badge is rebuilt from it on every push.
# Write AI names the way you like ("Claude", "github copilot", "DALL-E"),
# colors are picked for you. Full list of AIs: run
#   npx github:LuminoOwO/clanker-index-badge models

# Which design the README snippet uses. Both are always generated.
style: clanker        # clanker | serious

categories:
  # Measured from git automatically (commit trailers, bot accounts, git blame):
  code: auto
  bugfix: auto
  tests: auto
  docs: auto

  # Things git can't see: write the shares yourself. They don't have to add
  # up to 100, whatever is missing is counted as human.
  # ideas:  { human: 70, chatgpt: 30 }
  # images: { midjourney: 50, flux: 25, estimated: true }
  # audio:  { suno: 100 }
  # video:  off

# Optional:
# overall: average      # average | none | a category, e.g. code
# min_share: 2          # AIs under this % are grouped as "other"
# merge: { cursor: claude }   # count one AI as another (e.g. a tool as its model)
# paths:
#   ignore: ["generated/**"]
#   tests: ["qa/**"]
`;

export const AGENTS_MARKER = '<!-- clanker-index-badge -->';

export const AGENTS_SNIPPET = `${AGENTS_MARKER}
## AI attribution (Clanker Index)

This repo tracks how much of it was made by which AI. When you (an AI agent)
create a commit, add these trailers at the end of the commit message:

\`\`\`
Co-Authored-By: <your product name> <noreply@your-vendor.com>
Clanker-Model: <model or tool id, e.g. claude, codex, copilot, cursor, gemini>
Clanker-Category: <code | bugfix | tests | docs>
\`\`\`

- Use the category that fits most of the change. Use \`bugfix\` for fixes.
- Never add markers or attribution comments inside the source files.
- If you made images, audio or video, don't edit \`.clanker.yml\` on your own;
  mention it in your summary so a human can update the shares.
<!-- /clanker-index-badge -->
`;

export const WORKFLOW = `name: Clanker Index

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  badge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history, needed to see who wrote what
      - uses: ${ACTION_REF}
`;
