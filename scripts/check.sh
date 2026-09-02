#!/usr/bin/env bash
# Progress check for the live-coding exercise. Non-fatal: prints what's done.
set -uo pipefail
cd "$(dirname "$0")/.."

pass=0; fail=0
ok()   { printf '  \033[32m[x]\033[0m %s\n' "$1"; pass=$((pass+1)); }
no()   { printf '  \033[31m[!]\033[0m %s\n' "$1"; fail=$((fail+1)); }
todo() { printf '  \033[33m[ ]\033[0m %s\n' "$1"; }

has_dep() { node -e "const p=require('./package.json');process.exit(({...p.dependencies,...p.devDependencies})['$1']?0:1)" 2>/dev/null; }
env_set() { [ -f .env ] && grep -qE "^$1=.+" .env; }

echo
echo "Setup"
node -e 'process.exit(parseInt(process.versions.node) >= 22 ? 0 : 1)' \
  && ok "node $(node -v)" || no "node 22+ required (have $(node -v 2>/dev/null || echo none))"
[ -d node_modules ] && ok "dependencies installed" || no "run: npm install"
[ -f .env ] && ok ".env exists" || no "run: cp .env.example .env"
env_set OPENROUTER_API_KEY && ok "OPENROUTER_API_KEY set" || no "OPENROUTER_API_KEY missing in .env"
command -v clerk >/dev/null && ok "clerk CLI on PATH" || todo "npm i -g clerk  (optional but handy)"
if ls -d .claude/skills/clerk-* .agents/skills/clerk-* >/dev/null 2>&1; then
  ok "clerk skills installed"
else
  no "run: npx skills add clerk/skills"
fi

echo
echo "ISSUE-1 - Clerk auth"
has_dep @clerk/nextjs && ok "@clerk/nextjs installed" || todo "not yet: @clerk/nextjs"
env_set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && ok "publishable key set" || todo "not yet: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
env_set CLERK_SECRET_KEY && ok "secret key set" || todo "not yet: CLERK_SECRET_KEY"
{ [ -f proxy.ts ] || [ -f src/proxy.ts ] || [ -f middleware.ts ] || [ -f src/middleware.ts ]; } && ok "proxy.ts/middleware.ts exists" || todo "not yet: proxy.ts (Next 16) or middleware.ts with clerkMiddleware"
grep -rqs "ClerkProvider" app/ && ok "<ClerkProvider> wired in app/" || todo "not yet: <ClerkProvider> in app/layout.tsx"

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
  code=$(curl -s -o /dev/null -w '%{http_code}' "$MCP_URL/mcp")
  [ "$code" = "401" ] && ok "/mcp returns 401 (auth required)" || no "/mcp returned $code, expected 401"
  curl -s "$MCP_URL/.well-known/oauth-protected-resource/mcp" | grep -q authorization_servers \
    && ok "protected-resource metadata served" || no "no protected-resource metadata"
else
  echo
  todo "set MCP_URL=http://localhost:3000 to run live HTTP checks"
fi

echo
printf '%d passing, %d to fix\n\n' "$pass" "$fail"
