#!/usr/bin/env bash
# Progress check for the live-coding exercise. Non-fatal: prints what's done.
set -uo pipefail
cd "$(dirname "$0")/.."

pass=0; fail=0; pending=0
ok()   { printf '  \033[32m[x]\033[0m %s\n' "$1"; pass=$((pass+1)); }
no()   { printf '  \033[31m[!]\033[0m %s\n' "$1"; fail=$((fail+1)); }
todo() { printf '  \033[33m[ ]\033[0m %s\n' "$1"; pending=$((pending+1)); }

# In package.json AND actually installed.
has_dep() { node -e "const p=require('./package.json');process.exit(({...p.dependencies,...p.devDependencies})['$1']?0:1)" 2>/dev/null && [ -d "node_modules/$1" ]; }
# Next.js reads both; `clerk env pull` writes .env.local unless told otherwise.
env_set() { grep -qsE "^$1=.+" .env .env.local; }

echo
echo "Setup"
node -e 'process.exit(parseInt(process.versions.node) >= 22 ? 0 : 1)' \
  && ok "node $(node -v)" || no "node 22+ required (have $(node -v 2>/dev/null || echo none))"
{ [ -f .env ] || [ -f .env.local ]; } && ok ".env exists" || no "run: cp .env.example .env"
env_set OPENROUTER_API_KEY && ok "OPENROUTER_API_KEY set" || no "OPENROUTER_API_KEY missing in .env"
command -v clerk >/dev/null && ok "clerk CLI on PATH" || no "run: npm i -g clerk && clerk login"
# Claude Code reads .claude/skills; a symlink checked out as a text file (Windows) doesn't count.
if [ -f .claude/skills/clerk-cli/SKILL.md ]; then
  ok "clerk skills installed"
else
  no "run: npx skills add clerk/skills"
fi
# Only ISSUE-0 needs them; once the app exists they're optional.
if [ -f .claude/skills/langchain-fundamentals/SKILL.md ]; then
  ok "langchain skills installed"
elif [ ! -f lib/agent.ts ]; then
  no "run: npx skills add langchain-ai/langchain-skills --skill '*' --yes"
fi

echo
echo "ISSUE-0 - Pirate chat app"
if [ -f package.json ]; then
  ok "package.json exists"
  [ -d node_modules ] && ok "dependencies installed" || no "run: npm install"
  node -e "process.exit(require('./package.json').scripts?.check ? 0 : 1)" 2>/dev/null \
    && ok "npm run check script" || todo "not yet: \"check\": \"bash scripts/check.sh\" in package.json"
else
  todo "not yet: package.json (scaffold from langchain-nextjs-template)"
fi
has_dep next && ok "next installed" || todo "not yet: next"
has_dep @langchain/openai && ok "@langchain/openai installed" || todo "not yet: @langchain/openai"
grep -qs "export function buildAgent" lib/agent.ts \
  && ok "lib/agent.ts exports buildAgent()" || todo "not yet: lib/agent.ts exporting buildAgent(userName?)"
grep -qs "OPENROUTER" lib/agent.ts \
  && ok "agent uses OpenRouter" || todo "not yet: agent reads OPENROUTER_* from env"
grep -qs "buildAgent" app/api/chat/route.ts \
  && ok "/api/chat calls buildAgent()" || todo "not yet: app/api/chat/route.ts calling buildAgent()"

echo
echo "ISSUE-1 - Clerk auth"
has_dep @clerk/nextjs && ok "@clerk/nextjs installed" || todo "not yet: @clerk/nextjs"
env_set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && ok "publishable key set" || todo "not yet: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
env_set CLERK_SECRET_KEY && ok "secret key set" || todo "not yet: CLERK_SECRET_KEY"
{ [ -f proxy.ts ] || [ -f src/proxy.ts ] || [ -f middleware.ts ] || [ -f src/middleware.ts ]; } && ok "proxy.ts/middleware.ts exists" || todo "not yet: proxy.ts (Next 16) or middleware.ts with clerkMiddleware"
grep -rqs "ClerkProvider" app/ && ok "<ClerkProvider> wired in app/" || todo "not yet: <ClerkProvider> in app/layout.tsx"
grep -qsE "currentUser|auth\(" app/api/chat/route.ts \
  && ok "/api/chat passes the Clerk user to buildAgent()" || todo "not yet: /api/chat should pass the signed-in user's name"

echo
echo "ISSUE-1 - MCP server"
has_dep @clerk/mcp-tools && ok "@clerk/mcp-tools installed" || todo "not yet: @clerk/mcp-tools"
has_dep mcp-handler && ok "mcp-handler installed" || todo "not yet: mcp-handler"
ls app/*transport*/route.ts >/dev/null 2>&1 && ok "MCP route exists" || todo "not yet: app/[transport]/route.ts"
[ -f "app/.well-known/oauth-protected-resource/mcp/route.ts" ] \
  && ok "protected-resource metadata route" || todo "not yet: .well-known/oauth-protected-resource/mcp"
[ -f "app/.well-known/oauth-authorization-server/route.ts" ] \
  && ok "authorization-server metadata route" || todo "not yet: .well-known/oauth-authorization-server"
grep -rqs "buildAgent" app/*transport*/ 2>/dev/null \
  && ok "MCP tool calls buildAgent()" || todo "not yet: MCP tool should reuse lib/agent.ts"

if [ -n "${MCP_URL:-}" ]; then
  echo
  echo "Live check - $MCP_URL"
  headers=$(curl -s -o /dev/null -D - --max-time 15 "$MCP_URL/mcp")
  code=$(printf '%s' "$headers" | awk 'toupper($1) ~ /^HTTP/ {c=$2} END {print c}')
  if [ -z "$code" ]; then
    no "$MCP_URL not reachable - is \`npm run dev\` running / the deploy finished?"
  else
    if [ "$code" = "401" ]; then
      ok "/mcp returns 401 (auth required)"
      printf '%s' "$headers" | grep -qi '^www-authenticate:.*resource_metadata=.*oauth-protected-resource/mcp' \
        && ok "WWW-Authenticate points at the resource metadata" \
        || no "401 has no WWW-Authenticate resource_metadata (check withMcpAuth resourceMetadataPath)"
    else
      no "/mcp returned $code, expected 401"
    fi
    meta=$(curl -s --max-time 15 "$MCP_URL/.well-known/oauth-protected-resource/mcp")
    echo "$meta" | grep -q authorization_servers \
      && ok "protected-resource metadata served" || no "no protected-resource metadata"
    case "$MCP_URL" in
      *localhost*|*127.0.0.1*) ;;
      *) echo "$meta" | grep -q "localhost" \
           && no "metadata still advertises localhost" \
           || ok "no localhost in protected-resource metadata" ;;
    esac
  fi
else
  echo
  todo "set MCP_URL=http://localhost:3000 (or your https://<app>.vercel.app) to run live HTTP checks"
fi

echo
printf '%d passing, %d to fix, %d not yet done\n\n' "$pass" "$fail" "$pending"
