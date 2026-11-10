# Notes for AI agents

- Code is plain Node.js ESM in src/. Run `npm test` before committing.
- After changing src/, run `npm run build` and commit dist/ too (the GitHub Action runs dist/).
- Colors and AI names live only in src/palette.js.

<!-- clanker-index-badge -->
## AI attribution (Clanker Index)

This repo tracks how much of it was made by which AI. When you (an AI agent)
create a commit, add these trailers at the end of the commit message:

```
Co-Authored-By: <your product name> <noreply@your-vendor.com>
Clanker-Model: <model or tool id, e.g. claude, codex, copilot, cursor, gemini>
Clanker-Category: <code | bugfix | tests | docs>
```

- Use the category that fits most of the change. Use `bugfix` for fixes.
- Never add markers or attribution comments inside the source files.
- If you made images, audio or video, don't edit `.clanker.yml` on your own;
  mention it in your summary so a human can update the shares.
<!-- /clanker-index-badge -->
