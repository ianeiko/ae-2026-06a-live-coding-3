# ISSUE-2 — Deploy it, and connect Claude Code to the public URL

**Goal:** the MCP server lives at `https://<your-app>.vercel.app/mcp`, and
Claude Code on any machine can authenticate against it.

**Prerequisite:** ISSUE-1 works locally.

---

## Why bother

An MCP server on `localhost` is a demo. A deployed one is a product: anyone you
share the URL with signs in with their own Clerk identity and gets their own
personalised agent, with no key sharing and no config file editing.

Deploying also surfaces every place the code assumed `localhost` — which is
most of the OAuth metadata.

---

## Steps

> The one-shot prompt for this issue is in the README ("Prompts to paste into
> Claude Code").

### 1. Deploy to Vercel

```bash
npx vercel        # link + preview deploy
```

Set the environment variables on the project (`vercel env add`, or the
dashboard):

- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

Then `npx vercel --prod`.

Set the env vars **before** the production build, not after.
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined into the client bundle at build
time, so a deploy that ran without it stays broken until you redeploy — the
value appearing in `vercel env ls` afterwards changes nothing.

You can also just ask Claude Code — the Vercel skills and MCP server are
available in this repo.

### 2. Fix the URLs OAuth cares about

Metadata documents advertise absolute URLs. If anything still says
`http://localhost:3000`, clients will try to authenticate there.

The obstacle is not that someone hardcoded `localhost` — nobody did. It is
that Clerk's `protectedResourceHandlerClerk` derives the origin from `req.url`,
and behind Vercel's proxy `req.url` carries the *internal* host, not the one
the client dialled. The fix is to stop using that handler and call
`generateClerkProtectedResourceMetadata` (from `@clerk/mcp-tools/server`)
yourself, passing a `resourceUrl` you built from the request.

Have Claude Code derive the base URL from the incoming request
(`x-forwarded-host` + `x-forwarded-proto`) or from
`VERCEL_PROJECT_PRODUCTION_URL` rather than hardcoding it, and re-check:

```bash
curl -s https://<your-app>.vercel.app/.well-known/oauth-protected-resource/mcp | jq
```

Every URL in that response should be your deployed origin.

### 3. Clerk: production vs development

Test keys work on a Vercel URL, but if you move to a custom domain you need a
Clerk **production** instance: add the domain in Clerk, set the DNS records,
swap in the `pk_live_` / `sk_live_` keys. Dynamic client registration has to be
enabled on that instance too — it is a per-instance setting, and enabling it in
dev does not carry over.

### 4. Reconnect Claude Code

```bash
claude mcp remove pirate
claude mcp add --transport http pirate https://<your-app>.vercel.app/mcp
```

`/mcp` → authenticate → ask it something.

If `pirate` was already in your config pointing at localhost, `remove` + `add`
may leave Claude Code holding the stale, unreachable entry. In `/mcp`, pick
**Reconnect** first, then **Authenticate**.

### 5. Share it

Send the URL to the person next to you. They add the same MCP server, sign in
as themselves, and the pirate greets *them* by name. Same deployment, different
identity, zero shared secrets.

---

## Acceptance criteria

- [x] Production URL loads and sign-in works.
- [x] `curl -i https://ae-2026-06a-live-coding-3.vercel.app/mcp` → 401 with `WWW-Authenticate`.
- [x] No `localhost` anywhere in the `.well-known` responses.
- [x] Claude Code authenticates against the deployed server and calls the tool.
- [ ] A second person, with their own Clerk account, gets their own name back.

## Stretch

- Add the MCP server to a hosted client (Claude web/desktop connectors) and see
  the same OAuth flow work there.
- Add `clerk-webhooks` so `user.created` logs to your app.
