# ISSUE-1 — Expose the agent to Claude Code over an authenticated MCP server

**Goal:** Claude Code can call `ask-the-pirate` as a tool, signed in as you via
Clerk, and the pirate greets you by your real name.

**Scope:** local only (`localhost:3000`). Deployment is ISSUE-2.

**Prerequisite:** ISSUE-0's acceptance criteria pass.

---

## Why this is the interesting part

`/api/chat` is trivial — it's an HTTP POST. The MCP door needs OAuth 2.1 with
dynamic client registration, protected-resource metadata, token verification,
and a user identity threaded into the agent call. Written by hand that is a
long afternoon of RFC-reading.

Clerk ships that as a library plus skills. Your job is to get Claude Code to
use them, and to verify the result rather than trust it.

---

## Steps

> The prompt to paste is in the README. The prompts quoted below show what each
> step asks for. You only need them if you drive the steps one at a time.

### 1. Clerk instance

With the Clerk application created and `clerk link`ed (README → Setup), the
keys go into `.env`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

`clerk env pull --file .env` writes them. Without `--file`, it writes
`.env.local`, which also works, since both Next.js and `npm run check` read it.

**Then turn on dynamic client registration.** Dashboard → **Configure** →
**OAuth Applications** → enable *Dynamic client registration*. Without it
Claude Code cannot register itself and the login prompt never appears. This one
setting is the most common way this exercise fails.

The toggle is easy to miss in the dashboard. The CLI is unambiguous:

```bash
clerk api /instance/oauth_application_settings | jq .dynamic_oauth_client_registration
clerk api /instance/oauth_application_settings -X PATCH \
  -d '{"dynamic_oauth_client_registration":true}'
```

### 2. Add Clerk to the app

Prompt Claude Code with something like:

> Add Clerk auth to this Next.js app using the `clerk-setup` skill. Add
> `clerkMiddleware` in `proxy.ts`, wrap the app in `<ClerkProvider>`, and
> put `<SignInButton />` / `<UserButton />` in the header slot in
> `app/layout.tsx`. Keep the chat page public.

Verify: load `localhost:3000`, sign in, see your avatar in the header.

### 3. Personalise the agent

`buildAgent(userName?)` already takes a name. Wire `/api/chat` to pass the
signed-in user's first name through `auth()` / `currentUser()`, falling back to
anonymous when nobody is signed in.

Verify: signed in, ask the pirate "what's my name?" — it should know.

### 4. The MCP server

Prompt:

> Now expose `lib/agent.ts` as an MCP server using `mcp-handler` and
> `@clerk/mcp-tools`, following the Clerk "build an MCP server" guide. One tool,
> `ask-the-pirate`, taking a `question` string. Resolve the Clerk user from
> `authInfo.extra.userId` and pass their first name into `buildAgent`, so the
> tool answer is personalised the same way the chat is.

What should come out of that (review it, don't just accept it):

| File | Role |
| --- | --- |
| `app/[transport]/route.ts` | `createMcpHandler` wrapped in `withMcpAuth` + `verifyClerkToken`, serving `/mcp`. |
| `app/.well-known/oauth-protected-resource/mcp/route.ts` | `protectedResourceHandlerClerk` — tells clients where to authenticate. |
| `app/.well-known/oauth-authorization-server/route.ts` | `authServerMetadataHandlerClerk` — back-compat for older clients. |
| `proxy.ts` | The `.well-known` routes and `/mcp` must be reachable without a session cookie. |

Check these yourself, because they cause the usual bugs:

- `auth({ acceptsToken: 'oauth_token' })` — not the default session token.
- `withMcpAuth(..., { required: true, resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp' })`
  — without that path the client can't discover how to log in.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` — same `clerkMiddleware()`
  call, new filename.
- `mcp-handler` 2.x needs **zod 4**. The template ships zod 3, so `npm install
  zod@^4` — otherwise `inputSchema` fails to typecheck against
  `StandardSchemaWithJSON`.
- The tool handler's second argument is the request context, and the token lives
  at `http.authInfo`: `async ({ question }, { http }) => { const userId =
  http?.authInfo?.extra?.userId as string; … }`.

### 5. Connect Claude Code

```bash
claude mcp add --transport http pirate http://localhost:3000/mcp
```

Then in Claude Code:

```
/mcp
```

Pick `pirate` → **Authenticate**. A browser opens, Clerk signs you in, you
approve. Back in Claude Code the server goes green.

Tools are loaded at startup, so **restart Claude Code** after adding the
server — otherwise the green server has no callable `ask-the-pirate` yet.

### 6. Prove it

Ask Claude Code, in plain English:

> Ask the pirate what my name is.

It should call `ask-the-pirate` and come back with an answer that uses your
Clerk profile name. That round trip — Claude Code → OAuth → your route → Clerk
→ LangChain → back — is the whole demo.

---

## Acceptance criteria

- [ ] With `npm run dev` running, `MCP_URL=http://localhost:3000 npm run check`
      reports `0 to fix, 0 not yet done`. It confirms the unauthenticated
      **401** with a `WWW-Authenticate` header pointing at the resource
      metadata.
- [ ] `curl -s localhost:3000/.well-known/oauth-protected-resource/mcp | jq`
      names your Clerk instance under `authorization_servers`.
- [ ] Signed out, the chat at `/` doesn't know your name. Signed in, it greets
      you by name.
- [ ] `/mcp` in Claude Code shows `pirate` as connected after you authenticate.
- [ ] Claude Code calls `ask-the-pirate`, and the reply uses your Clerk first
      name. Note the reply you actually got.

The unauthenticated 401 above already proves the door is shut; don't revoke the
grant to re-prove it — Claude Code's OAuth client is a *dynamically registered*
app, so deleting it means re-registering and re-authenticating before the tool
works again. If you want to look at the grant, it's in Dashboard → your app →
**Configure** → **OAuth Applications** → *Claude Code (pirate)* (instance-level,
not under your user).

## Stretch

- Add a second tool that only works for signed-in users on a paid plan
  (`clerk-billing` skill).
- Add an org-scoped tool that answers differently per Clerk organization
  (`clerk-orgs` skill).
