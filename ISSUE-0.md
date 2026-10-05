# ISSUE-0 — Build the pirate chat app

**Goal:** `localhost:3000` serves a chat with Patchy the pirate, and the agent
lives in one file, `lib/agent.ts`, that ISSUE-1 can reuse for the MCP door.

**Scope:** no auth, no MCP. That's ISSUE-1.

---

## Why start here

The rest of the exercise adds a second front door to an agent. This issue
builds the agent and the first door. It also shows how fast an official
template plus LangChain's skills gets you a working app. You don't write any
of it by hand.

---

## Steps

> The prompt to paste is in the README.

### 1. Scaffold from the template

Start from [`langchain-ai/langchain-nextjs-template`](https://github.com/langchain-ai/langchain-nextjs-template):

```bash
npx create-next-app@latest <tmp-dir> --example https://github.com/langchain-ai/langchain-nextjs-template --use-npm --disable-git
```

`create-next-app` refuses a non-empty directory, so scaffold into a temporary
directory and move the files into the repo root. Keep this repo's own files:
`README.md`, `ISSUE-*.md`, `CLAUDE.md`, `WINDOWS.md`, `.env.example`,
`.gitignore`, `.gitattributes`, `scripts/`, `.claude/`, `.agents/` and
`skills-lock.json`. Drop the template's `README.md`, `yarn.lock` and
`.env.example`.

### 2. Trim it to one agent

The template's simple chat (`app/api/chat/route.ts`) is already Patchy the
pirate. Keep that and remove everything else: the agents, retrieval,
structured-output, LangGraph and AI SDK demos (their pages, API routes and
components, plus the navbar that links to them), and any dependencies only
they used.

### 3. Pull the agent into `lib/agent.ts`

ISSUE-1 relies on this shape:

- `lib/agent.ts` exports `buildAgent(userName?: string)`, which returns
  `{ stream(question), invoke(question) }`.
- With a name, Patchy greets the user by it. Without one, Patchy says it
  doesn't know the user's name.
- The model is `ChatOpenAI` pointed at OpenRouter, reading
  `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` and `OPENROUTER_MODEL` from
  `.env`. See `.env.example`.
- `app/api/chat/route.ts` calls `buildAgent().stream(question)` with no name
  yet. ISSUE-1 passes the signed-in user's name in.
- `app/layout.tsx` has a header with room on the right for a sign-in button.
  ISSUE-1 puts it there.

### 4. Make the tooling clean

- Add `"check": "bash scripts/check.sh"` to `package.json` scripts.
- Pin `eslint` to `^9`. The template ships ESLint 10, but
  `eslint-config-next`'s plugins only support up to 9, and `npm run lint`
  crashes with `scopeManager.addGlobals is not a function`.
- Drop `export const runtime = "edge"` from the chat route. ISSUE-1 calls
  Clerk's server helpers there.

---

## Acceptance criteria

- [ ] `npm run check` shows every ISSUE-0 line as `[x]`.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] `npm run dev`, then at `localhost:3000` Patchy answers in pirate
      dialect. Ask "what's my name?" and Patchy says it doesn't know.
