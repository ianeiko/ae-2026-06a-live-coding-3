# Windows notes

Everything here was written and tested on macOS. The app itself is fine on
Windows — Node, Next.js, Clerk and Vercel all are. What breaks is the *shell*
around it: five commands in the README and the two issues assume a Unix shell.

**Shortest path: run everything from Git Bash** (ships with
[Git for Windows](https://git-scm.com/download/win)). Every command in this
repo then works as written, and you can stop reading here. The rest of this
appendix is for people who'd rather stay in PowerShell.

### The five differences

| # | Where | Breaks because | In PowerShell |
| --- | --- | --- | --- |
| 1 | `npm run check`, `bash scripts/check.sh` | The script is `bash scripts/check.sh`. npm runs scripts through `cmd.exe`, so `bash` must be on `PATH` — Git for Windows doesn't put it there by default. | Run `npm run check` from Git Bash, or once: `npm config set script-shell "C:\Program Files\Git\bin\bash.exe"` |
| 2 | `cp .env.example .env` | `cp` is a PowerShell alias for `Copy-Item`, so this one actually works. It fails only in `cmd.exe`. | `cmd.exe`: `copy .env.example .env` |
| 3 | `curl -s ...` in ISSUE-1, ISSUE-2 §2 | In Windows PowerShell 5.1 (the version Windows ships), `curl` is an alias for `Invoke-WebRequest`, which doesn't understand `-s`. | Call the real binary: `curl.exe -s ...`. PowerShell 7+ dropped the alias. |
| 4 | `... \| jq` | `jq` isn't installed on Windows. | `winget install jqlang.jq`, or skip it: `curl.exe -s <url> \| ConvertFrom-Json` |
| 5 | `MCP_URL=... npm run check` | Inline `VAR=value command` is Unix shell syntax. | `$env:MCP_URL = "https://<app>.vercel.app"` then `npm run check` |

### Once you're editing

- **`app/[transport]/route.ts`** — PowerShell treats `[` and `]` in a path as
  wildcards, so `cat app/[transport]/route.ts` finds nothing. Use
  `Get-Content -LiteralPath 'app/[transport]/route.ts'`. Claude Code's own file
  tools are unaffected.
- **Line endings** — `.gitattributes` pins `*.sh` to LF. Without it,
  `core.autocrlf=true` (the Git for Windows default) checks out `check.sh` with
  CRLF and bash dies on the shebang with `$'\r': command not found`. If you
  cloned before that file existed, `git rm --cached -r . && git reset --hard`
  re-normalises.
- **Skills symlinks** — `.claude/skills/clerk-*` are symlinks into
  `.agents/skills/`. Git for Windows checks symlinks out as small text files
  unless `core.symlinks=true` and Developer Mode are on, so Claude Code sees no
  Clerk skills (`/clerk` does nothing). Run `npx skills add clerk/skills` to
  install real copies.

### Not a problem

`npm install`, `npm run dev`, `npm run build`, `npx vercel`, `npm i -g clerk`,
`clerk login`, and every `claude mcp` command are cross-platform as written.
The OAuth flow opens your default browser either way.
