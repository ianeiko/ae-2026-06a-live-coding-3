# ISSUE-1 — Expose the agent to Claude Code over an authenticated MCP server

**Goal:** Claude Code can call `ask-the-pirate` as a tool, signed in as you via
Clerk, and the pirate greets you by your real name.

**Scope:** local only (`localhost:3000`). Deployment is ISSUE-2.

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

### 1. Clerk instance

Create an application at [dashboard.clerk.com](https://dashboard.clerk.com)
(email + Google is fine), then put the keys in `.env`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

`clerk env pull` can do this for you — ask Claude Code to use the `clerk-cli`
skill.

**Then turn on dynamic client registration.** Dashboard → **OAuth
Applications** → enable *Dynamic client registration*. Without it Claude Code
cannot register itself and the login prompt never appears. This one setting is
the most common way this exercise fails.

### 2. Add Clerk to the app

Prompt Claude Code with something like:

> Add Clerk auth to this Next.js app using the `clerk-setup` skill. Add
> `clerkMiddleware` in `middleware.ts`, wrap the app in `<ClerkProvider>`, and
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
| `middleware.ts` | The `.well-known` routes and `/mcp` must be reachable without a session cookie. |

Two details worth checking yourself, because they are the usual bugs:

- `auth({ acceptsToken: 'oauth_token' })` — not the default session token.
- `withMcpAuth(..., { required: true, resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp' })`
  — without that path the client can't discover how to log in.

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

### 6. Prove it

Ask Claude Code, in plain English:

> Ask the pirate what my name is.

It should call `ask-the-pirate` and come back with an answer that uses your
Clerk profile name. That round trip — Claude Code → OAuth → your route → Clerk
→ LangChain → back — is the whole demo.

---

## Acceptance criteria

- [ ] `npm run check` passes.
- [ ] Signed-in chat at `/` greets you by name.
- [ ] `curl -i localhost:3000/mcp` returns **401** with a
      `WWW-Authenticate` header pointing at the resource metadata.
- [ ] `curl -s localhost:3000/.well-known/oauth-protected-resource/mcp | jq`
      returns JSON naming your Clerk instance as the authorization server.
- [ ] `/mcp` in Claude Code shows `pirate` connected after authenticating.
- [ ] Claude Code calls `ask-the-pirate` and the reply is personalised.
- [ ] Signing out of Clerk and revoking the app makes the tool fail with 401.

## Stretch

- Add a second tool that only works for signed-in users on a paid plan
  (`clerk-billing` skill).
- Add an org-scoped tool that answers differently per Clerk organization
  (`clerk-orgs` skill).
