# CLAUDE.md

Teaching repo: one LangChain agent, exposed both as a chat UI and (the
exercise) as a Clerk-authenticated MCP server. Learners drive you through
`ISSUE-1.md` then `ISSUE-2.md`.

## Rules

- Read `lib/agent.ts` before touching anything. It is the single source of
  agent behaviour; both the chat route and the MCP tool must go through it.
- Use the installed Clerk skills — `clerk-setup`, `clerk-nextjs-patterns`,
  `clerk-cli`, `clerk-orgs`, `clerk-billing`, `clerk-webhooks`. Don't
  reconstruct Clerk APIs from memory.
- MCP server work follows `@clerk/mcp-tools` + `mcp-handler`. The canonical
  shape is Clerk's "build an MCP server" guide for Next.js.
- Never write secrets into tracked files. `.env` only.
- Keep diffs small and reviewable — the learner is reading them.
- Don't do ISSUE-2 work while ISSUE-1 is unfinished.

## Layout

```
lib/agent.ts              the agent (LangChain + OpenRouter)
app/api/chat/route.ts     browser door
app/[transport]/route.ts  MCP door — learner creates this
components/ChatWindow.tsx chat UI
scripts/check.sh          progress check, `npm run check`
```

## Commands

```bash
npm run dev
npm run check
npm run build
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
