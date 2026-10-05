# Live coding 3 — a LangChain agent with a Clerk-authenticated MCP server

You start with an empty repo. First Claude Code builds a LangChain chat app
from the official template. Then it gives that same agent a second front door:
an MCP **tool** that Claude Code calls, signed in as *you* through Clerk, and
the pirate greets you by name. You don't hand-write the app or the OAuth
plumbing. LangChain's and Clerk's skills and libraries handle it, and your job
is to review and verify the result.

```
  browser ─────▶ /api/chat ──┐                                     ISSUE-0
                             ├─▶ lib/agent.ts (LangChain + OpenRouter)
  Claude Code ─▶ /mcp ───────┘                                     ISSUE-1
                   │ OAuth 2.1
                   ▼
                 Clerk
```

**Start on the `fresh-start` branch** (`git switch fresh-start`). `main` is the
finished instructor solution.

## Setup

On top of Node 22+ and Claude Code you need these accounts: an
[OpenRouter](https://openrouter.ai) API key, and free [Clerk](https://clerk.com)
and [Vercel](https://vercel.com) accounts (Vercel is needed only for ISSUE-2).

```bash
cp .env.example .env      # fill in OPENROUTER_API_KEY
npx skills add langchain-ai/langchain-skills --skill '*' --yes
npm i -g clerk && clerk login
bash scripts/check.sh     # [!] = fix now, [ ] = the exercise will do it
```

Clerk's agent skills are already in `.claude/skills/`, and the second command
adds LangChain's next to them. In Claude Code, `/clerk` should route you to a
Clerk skill. If it doesn't, run `npx skills add clerk/skills`.

Create an application in the [Clerk dashboard](https://dashboard.clerk.com)
(email + Google is fine), then run `clerk link` here and pick it.

## Prompts

Start `claude` in this directory and paste these. Each issue file contains the
details, so each prompt only needs to point at it.

**0 — [ISSUE-0.md](./ISSUE-0.md): the pirate chat app, from the LangChain template.**

```
Read @ISSUE-0.md and implement it end to end. Use the langchain-fundamentals
and langchain-dependencies skills for the LangChain code.

Verify with npm run check, npm run lint and npm run build, then start the dev
server and tell me to try the chat at localhost:3000. Do not start ISSUE-1.
```

**1 — [ISSUE-1.md](./ISSUE-1.md): sign-in plus an MCP server at `/mcp`, locally.**
Start this once ISSUE-0's acceptance criteria pass.

```
Read @ISSUE-1.md and @lib/agent.ts, then implement ISSUE-1 end to end.

Use the clerk-setup and clerk-nextjs-patterns skills for the auth work, the
clerk-cli skill for my Clerk instance (keys into .env, dynamic client
registration), and follow @clerk/mcp-tools + mcp-handler exactly as Clerk's
"build an MCP server" guide does. Never print secret values.

Verify as you go: npm run build, and MCP_URL=http://localhost:3000 npm run
check with the dev server running. Stop only when you need me to sign in in
the browser or authenticate in Claude Code, then walk me through the
acceptance criteria. Do not touch ISSUE-2.
```

**2 — [ISSUE-2.md](./ISSUE-2.md): deploy to Vercel and connect to the public URL.**
Start this only once ISSUE-1's acceptance criteria pass.

```
Read @ISSUE-2.md and implement it. Deploy to Vercel with the Vercel CLI
(npx vercel; stop if I need to log in), set the env vars from my .env without
printing them, and make sure nothing in the .well-known OAuth metadata points
at localhost.

Verify with MCP_URL=https://<deployed-url> npm run check, then give me the
exact `claude mcp add` command and walk me through the acceptance criteria.
```

**If something breaks:**

```
`npm run check` says: <paste output>. Diagnose it against the issue I'm on
(@ISSUE-0.md or @ISSUE-1.md) and fix it. Use the clerk-cli skill to inspect my
Clerk instance config rather than guessing.
```

Review every diff before you accept it.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `npm run lint` crashes with `scopeManager.addGlobals is not a function` | The template ships ESLint 10. Pin `eslint@^9` — ISSUE-0 §4. |
| `npm run check`: missing script | Before ISSUE-0 there is no `package.json`. Run `bash scripts/check.sh`. |
| `/mcp` in Claude Code never prompts you to log in | Dynamic client registration is off — ISSUE-1 §1. |
| Login works, then every tool call returns 401 | `withMcpAuth` is missing `resourceMetadataPath`, or `proxy.ts` requires a session on `/mcp` or `/.well-known/*`. |
| `authInfo` is undefined inside a tool | The token was never verified. Check for `acceptsToken: 'oauth_token'`. |
| `pirate` shows as connected, but there's no `ask-the-pirate` tool | Tools load at startup. Restart Claude Code. |
| `inputSchema` type errors in `app/[transport]/route.ts` | `mcp-handler` 2.x needs zod 4: `npm install zod@^4`. |
| The deployed `.well-known` advertises the wrong host | ISSUE-2 §2. |
| Deployed sign-in doesn't work even though the keys are set in Vercel | `NEXT_PUBLIC_*` values are inlined at build time. Redeploy. |
| After `claude mcp remove` + `add`, the server still won't connect | Claude Code kept a stale entry. In `/mcp`, choose Reconnect, then Authenticate. |
| Windows: `bash: not found`, `$'\r'`, `curl -i` errors, or `/clerk` does nothing | See [WINDOWS.md](./WINDOWS.md). |

## Reference

- [Clerk: build an MCP server](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server)
  · [`clerk/mcp-tools`](https://github.com/clerk/mcp-tools)
  · [`clerk/skills`](https://github.com/clerk/skills)
  · [MCP spec: authorization](https://modelcontextprotocol.io/specification/basic/authorization)
- [`langchain-ai/langchain-nextjs-template`](https://github.com/langchain-ai/langchain-nextjs-template)
  — ISSUE-0's starting point
  · [`langchain-ai/langchain-skills`](https://github.com/langchain-ai/langchain-skills)
