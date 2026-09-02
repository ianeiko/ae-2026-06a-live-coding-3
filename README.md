# Live coding 3 — add a Clerk-authenticated MCP server to a LangChain app

You have a working LangChain chat app. By the end of this session Claude Code
will be able to talk to that same agent as a **tool**, over MCP, authenticated
as *you* through Clerk — and you will not have hand-written the plumbing.

That is the whole point of the exercise: MCP + auth sounds like a week of OAuth
work. With the vendor's own skills and libraries installed, it is a
conversation.

```
                 ┌─────────────────────┐
  browser ─────▶ │  Next.js app        │
                 │  /api/chat ──┐      │
                 │              ├─▶ lib/agent.ts (LangChain)
  Claude Code ─▶ │  /mcp ───────┘      │
                 └──────┬──────────────┘
                        │ OAuth 2.1 (Clerk)
                        ▼
                    Clerk instance
```

One agent, two front doors. The second door is the work.

---

## What's already here

| Path | What it is |
| --- | --- |
| `lib/agent.ts` | The agent. A LangChain prompt + `ChatOpenAI` pointed at OpenRouter. |
| `app/api/chat/route.ts` | Browser door — streams the agent to the chat UI. |
| `components/ChatWindow.tsx` | Minimal chat UI, trimmed from the official LangChain Next.js template. |
| `ISSUE-1.md` | Build the MCP door, locally. |
| `ISSUE-2.md` | Deploy it so the MCP server has a real URL. |

Trimmed from [`langchain-ai/langchain-nextjs-template`](https://github.com/langchain-ai/langchain-nextjs-template)
down to one agent, so the diff you make is the thing you learn.

---

## Setup (10 minutes, do this before the session)

You need: **Node 22+**, a **Claude Code** install, an **OpenRouter** key, and a
free **Clerk** account.

```bash
npm install
cp .env.example .env      # fill in OPENROUTER_API_KEY
npm run dev               # http://localhost:3000 — chat with the pirate
npm run check             # tells you what's still missing
```

Then install the two things that make this easy:

```bash
# 1. Clerk's agent skills — teaches Claude Code how Clerk works
npx skills add clerk/skills

# 2. Clerk CLI — lets Claude Code read your instance config, keys, users
npm i -g @clerk/cli && clerk login
```

`npx skills add clerk/skills` drops ~15 skills into `.claude/skills/`
(`clerk-setup`, `clerk-nextjs-patterns`, `clerk-cli`, …). They are already
listed in `skills-lock.json` here, so a plain `npx skills add clerk/skills`
restores exactly the set this repo expects.

Sanity check inside Claude Code:

```
/clerk
```

If it routes you to a Clerk skill, you're ready.

---

## The session

Work through the issues **in order**, and work through them *with Claude Code*,
not around it. Each issue tells you what to ask for, not what to type.

1. **[ISSUE-1.md](./ISSUE-1.md)** — sign-in + an MCP server at `/mcp`, connected
   to Claude Code. This is the demo.
2. **[ISSUE-2.md](./ISSUE-2.md)** — deploy to Vercel, point Claude Code at the
   public URL.

### How to drive Claude Code here

The failure mode is asking for "add MCP" and getting a plausible-looking
non-working route. The fix is one line of context:

> Use the `clerk-setup` and `clerk-nextjs-patterns` skills, and follow
> `@clerk/mcp-tools` for the MCP server. Read `lib/agent.ts` first.

Then let it work. Review the diff before you accept it — you are the reviewer,
not the typist.

---

## Reference

- [`clerk/mcp-tools`](https://github.com/clerk/mcp-tools) — the library. OAuth
  metadata endpoints, `verifyClerkToken`, session stores.
- [`clerk/skills`](https://github.com/clerk/skills) — the skills you installed.
- [Clerk: build an MCP server](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server)
- [MCP spec: authorization](https://modelcontextprotocol.io/specification/basic/authorization)

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/mcp` in Claude Code never prompts to log in | Dynamic client registration is off in the Clerk dashboard. |
| Prompts to log in, then 401 on every tool call | `withMcpAuth` is missing `resourceMetadataPath`, or the well-known routes aren't public in `middleware.ts`. |
| `authInfo` is undefined inside a tool | Token wasn't verified — check `acceptsToken: 'oauth_token'`. |
| Chat UI works, MCP doesn't | Good. That's the expected starting state. |
