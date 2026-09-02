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
npm i -g clerk && clerk login
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

### Prompts to paste into Claude Code

Start Claude Code in this directory (`claude`), then paste these verbatim. One
per issue — each issue file carries the detail, so the prompt just points at it.

**ISSUE-1** (do the Clerk dashboard steps in ISSUE-1 §1 first — including
*Dynamic client registration* — then paste):

```
Read @ISSUE-1.md and @lib/agent.ts, then implement ISSUE-1 step by step.

Use the clerk-setup and clerk-nextjs-patterns skills for the auth work, the
clerk-cli skill for anything touching my Clerk instance or keys, and follow
@clerk/mcp-tools + mcp-handler for the MCP server exactly as Clerk's "build an
MCP server" guide does.

Stop after each numbered step, tell me the verification command to run, and
wait for me to confirm before moving on. Do not touch ISSUE-2.
```

**ISSUE-2** (only once ISSUE-1's acceptance criteria pass):

```
Read @ISSUE-2.md and implement it. Deploy this app to Vercel with the Vercel
skills, set the env vars from my .env, and make sure nothing in the
.well-known OAuth metadata still points at localhost — derive the origin from
the request or VERCEL_PROJECT_PRODUCTION_URL.

Then give me the exact `claude mcp add` command for the deployed URL and walk
me through the acceptance criteria.
```

**When something breaks:**

```
`npm run check` says: <paste output>. Diagnose it against @ISSUE-1.md and fix
it. Use the clerk-cli skill to inspect my instance config rather than guessing.
```

The failure mode is asking for "add MCP" with no context and getting a
plausible-looking non-working route — naming the skills and the library is what
prevents that. Review the diff before you accept it: you are the reviewer, not
the typist.

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
| Prompts to log in, then 401 on every tool call | `withMcpAuth` is missing `resourceMetadataPath`, or the well-known routes aren't public in `proxy.ts` (`middleware.ts` pre-Next 16). |
| `authInfo` is undefined inside a tool | Token wasn't verified — check `acceptsToken: 'oauth_token'`. |
| Server green in `/mcp` but no `ask-the-pirate` tool | Tools load at startup — restart Claude Code. |
| `inputSchema` type errors in `app/[transport]/route.ts` | `mcp-handler` 2.x wants zod 4; `npm install zod@^4`. |
| Chat UI works, MCP doesn't | Good. That's the expected starting state. |
| Deployed `.well-known` still advertises a wrong host | `protectedResourceHandlerClerk` reads the origin off `req.url`, which behind Vercel's proxy is the internal host. Build `resourceUrl` from `x-forwarded-host` instead — ISSUE-2 §2. |
| Deployed sign-in dead, keys are set in Vercel | `NEXT_PUBLIC_*` is inlined at build time. Redeploy after adding it. |
| `claude mcp remove` + `add` and the server still won't connect | Stale entry. `/mcp` → Reconnect, then Authenticate. |
| On Windows: `bash: not found`, `$'\r': command not found`, or `curl` rejecting `-i` | Unix-shell assumptions — see the Windows appendix below. |

---

## Appendix — Windows

Everything here was written and tested on macOS. The app itself is fine on
Windows — Node, Next.js, Clerk and Vercel all are. What breaks is the *shell*
around it: five commands in this README and the two issues assume a Unix shell.

**Shortest path: run everything from Git Bash** (ships with
[Git for Windows](https://git-scm.com/download/win)). Every command in this
repo then works as written, and you can stop reading here. The rest of this
appendix is for people who'd rather stay in PowerShell.

### The five differences

| # | Where | Breaks because | In PowerShell |
| --- | --- | --- | --- |
| 1 | `npm run check` | The script is `bash scripts/check.sh`. npm runs scripts through `cmd.exe`, so `bash` must be on `PATH` — Git for Windows doesn't put it there by default. | Run `npm run check` from Git Bash, or once: `npm config set script-shell "C:\Program Files\Git\bin\bash.exe"` |
| 2 | `cp .env.example .env` | `cp` is a PowerShell alias for `Copy-Item`, so this one actually works. It fails only in `cmd.exe`. | `cmd.exe`: `copy .env.example .env` |
| 3 | `curl -i ...` in ISSUE-1, ISSUE-2 §2 | In Windows PowerShell 5.1 (the version Windows ships), `curl` is an alias for `Invoke-WebRequest`, which doesn't understand `-i`/`-s`. | Call the real binary: `curl.exe -i ...`. PowerShell 7+ dropped the alias. |
| 4 | `... \| jq` | `jq` isn't installed on Windows. | `winget install jqlang.jq`, or skip it: `curl.exe -s <url> \| ConvertFrom-Json` |
| 5 | `MCP_URL=... npm run check` | Inline `VAR=value command` is Unix shell syntax. | `$env:MCP_URL = "https://<app>.vercel.app"` then `npm run check` |

### Two more, once you're editing

- **`app/[transport]/route.ts`** — PowerShell treats `[` and `]` in a path as
  wildcards, so `cat app/[transport]/route.ts` finds nothing. Use
  `Get-Content -LiteralPath 'app/[transport]/route.ts'`. Claude Code's own file
  tools are unaffected.
- **Line endings** — `.gitattributes` pins `*.sh` to LF. Without it,
  `core.autocrlf=true` (the Git for Windows default) checks out `check.sh` with
  CRLF and bash dies on the shebang with `$'\r': command not found`. If you
  cloned before that file existed, `git rm --cached -r . && git reset --hard`
  re-normalises.

### Not a problem

`npm install`, `npm run dev`, `npm run build`, `npx vercel`, `npm i -g clerk`,
`clerk login`, and every `claude mcp` command are cross-platform as written.
The OAuth flow opens your default browser either way.
