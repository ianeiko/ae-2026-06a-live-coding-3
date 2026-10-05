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

> The prompt to paste is in the README.

### 1. Deploy to Vercel

```bash
vercel whoami     # logged in? If not, stop: the learner runs vercel login
vercel link       # create/link the project, no deploy yet
```

Set the environment variables for **Production** (`vercel env add`, or the
dashboard):

- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

Then `vercel --prod`.

Set the env vars **before** the production build, not after.
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined into the client bundle at build
time, so a deploy that ran without it stays broken until you redeploy — the
value appearing in `vercel env ls` afterwards changes nothing.

Use the production URL (`https://<your-app>.vercel.app`) from here on. Preview
URLs (`<your-app>-<hash>-<team>.vercel.app`) sit behind Vercel's Deployment
Protection: they answer `302` to a Vercel login page, so neither
`npm run check` nor Claude Code can reach them.

### 2. Check the URLs OAuth cares about

Metadata documents advertise absolute URLs. If anything says
`http://localhost:3000`, clients will try to authenticate there.

```bash
curl -s https://<your-app>.vercel.app/.well-known/oauth-protected-resource/mcp | jq
curl -s -D - -o /dev/null https://<your-app>.vercel.app/mcp | grep -i www-authenticate
```

`resource` and the `resource_metadata` in the 401 should both be your
deployed origin; `authorization_servers` should be your Clerk instance. On
Vercel this works without code changes: nobody hardcoded `localhost`, and both
`protectedResourceHandlerClerk` (from `req.url`) and `mcp-handler` (from
`x-forwarded-host`) derive the origin from the request the client actually
made. That is the point of this step — the metadata is computed per request,
so the same code is correct on `localhost` and in production.

It breaks behind a proxy that rewrites the `Host` header (some nginx, Docker
or tunnel setups): `req.url` then carries the internal host. The fix there is
to replace `protectedResourceHandlerClerk` with a direct call to
`generateClerkProtectedResourceMetadata` (from `@clerk/mcp-tools/server`),
passing a `resourceUrl` built from `x-forwarded-host` + `x-forwarded-proto`.

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

- [ ] The production URL loads, and signing in works there.
- [ ] `MCP_URL=https://<your-app>.vercel.app npm run check` reports
      `0 to fix, 0 not yet done`. That covers the 401 with `WWW-Authenticate`
      and the metadata advertising your deployed origin, not `localhost`.
- [ ] Claude Code authenticates against the deployed server and calls the tool.
- [ ] A second Clerk account gets its own name back from the tool. Ask the
      person next to you, or do it yourself: add the server again as `pirate2`,
      then complete its login in a private window as a different Clerk user.

## Stretch

- Add the MCP server to a hosted client (Claude web/desktop connectors) and see
  the same OAuth flow work there.
- Add `clerk-webhooks` so `user.created` logs to your app.
