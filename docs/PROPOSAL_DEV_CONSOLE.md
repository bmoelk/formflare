# FormFlare DX, Security & Configuration Architecture Proposal

**Author**: Brian Moelk  
**Status**: Revised Proposal / RFC  
**Target Repository**: `formflare` (`/Users/bmo/code/websites/formflare`)

---

## 1. Executive Summary & Strategy

FormFlare is an edge-native form engine built on Cloudflare Workers, Hono, and D1/KV. The goal of this update is to make FormFlare:
1. **100% Safe for Public Repositories**: Zero secrets, private email addresses, custom domain routes, or infrastructure UUIDs hardcoded in git.
2. **Frictionless for Local Dev**: Local mocking via `.dev.vars`, stdout email console logging, and zero-config Wrangler/Miniflare local storage.
3. **Transparent & Guided Setup**: Transparent CLI setup wizard (`npx formflare setup` or `npm run setup`) that walks developers through configuration and explicitly prints a detailed manifest of all modified files, paths, and cloud secret targets upon completion.

---

## 2. Configuration Breakdown Matrix

FormFlare configuration consists of 5 distinct types of data. Here is the definitive guide on where each portion lives across Local Development vs. Production Deployment:

| Config Category | Scope & Sensitivity | Required vs. Optional | Local Dev (Miniflare / Wrangler) | Production Deployment (Cloudflare) |
| :--- | :--- | :--- | :--- | :--- |
| **A. Secret Keys & Tokens** | Sensitive (`TURNSTILE_SECRET_KEY`, `EMAIL_API_KEY`, `API_KEY`) | **Required**: Turnstile & API Key.<br />**Optional**: Email API Key. | Root `.dev.vars` (Git-ignored) | Cloudflare KMS (`npx wrangler secret put`) |
| **B. Private Settings** | Sensitive (`EMAIL_FROM`, `EMAIL_TO`, `WEBHOOK_URL`) | **Optional**: Required only if emails enabled. | Root `.dev.vars` (Git-ignored) | Cloudflare KMS (`npx wrangler secret put`) |
| **C. Public Options** | Non-sensitive (`ALLOWED_ORIGINS`, `RATE_LIMIT_*`, `EMAIL_PROVIDER`) | **Required**: System defaults. | `wrangler.toml` `[vars]` or `.dev.vars` | `wrangler.toml` `[vars]` |
| **D. Resource UUIDs** | Infra IDs (`D1 Database ID`, `KV Namespace ID`) | **Optional** in dev.<br />**Required** in prod. | **Auto-mocked in local SQLite** (`.wrangler/state/`) | Cloudflare Dashboard or `wrangler.local.toml` |
| **E. Domain Routes** | Triggers (`pattern = "contact.example.com"`) | **Optional** (defaults to `*.workers.dev`). | `localhost:8787` | Cloudflare Dashboard (Custom Domains) or `wrangler.local.toml` |

---

## 3. Detailed Environment Rulebook

### A. Public Configuration (`wrangler.toml` under `[vars]`)
Contains **ONLY** generic, non-sensitive default values that are safe to share publicly in open-source Git repositories.

```toml
# wrangler.toml (Public Git)
name = "formflare"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[assets]
directory = "public"
binding = "ASSETS"

[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "*"
RATE_LIMIT_ENABLED = "false"
RATE_LIMIT_REQUESTS = "10"
RATE_LIMIT_WINDOW = "60"
EMAIL_PROVIDER = "none"
```

---

### B. Local Development Configuration (`.dev.vars`)
When running `npx wrangler dev`, Miniflare automatically injects `.dev.vars` into the worker runtime context (`c.env`). Local dev requires **zero external cloud setup**; D1 and KV are automatically mocked in local SQLite files (`.wrangler/state/v3/d1`).

```ini
# .dev.vars (Git-ignored)
DEV_MODE=true
DEV_MOCK_TURNSTILE=true
ALLOWED_ORIGINS=*

# Turnstile Dummy Key (Cloudflare official test key)
TURNSTILE_SECRET_KEY=1x00000000000000000000AA00000000000

# Dev Email Configuration (logs to stdout console)
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@localhost
EMAIL_TO=dev@example.com

# Local API Key for testing /submissions
API_KEY=dev-secret-key-123
```

---

## 4. Transparent CLI Setup Wizard (`npm run setup`)

To eliminate setup confusion without obscuring modified state, FormFlare includes an interactive setup wizard (`scripts/setup.js`). At completion, it outputs a **Transparent Summary Manifest** detailing exact file modifications and resource dispatches.

### Interactive Terminal Flow & Summary Manifest

```text
  ┌─────────────────────────────────────────────────────────────┐
  │ 🔥 FormFlare Interactive Setup Wizard                       │
  └─────────────────────────────────────────────────────────────┘

  ? Select setup target:
  ❯ 1. Local Development (.dev.vars)
    2. Cloudflare Production Secrets (wrangler secret put)
    3. Generate wrangler.local.toml for Custom Domain

  ? Select Email Provider: console
  ? Enter Notification Target Email (EMAIL_TO): dev@example.com
  ? Enter Sender Email (EMAIL_FROM): noreply@localhost

  ===============================================================
  📋 SETUP MANIFEST & MODIFIED RESOURCES SUMMARY
  ===============================================================
  [FILE CREATED]  .dev.vars
                  Path: /path/to/formflare/.dev.vars
                  Vars: DEV_MODE=true, EMAIL_PROVIDER=console, ...

  [FILE CREATED]  wrangler.local.toml (Git-ignored)
                  Path: /path/to/formflare/wrangler.local.toml
                  Routes: contact.example.com

  [NEXT STEPS]
  • Local dev:     npx wrangler dev
  • Inspect code:  git status
  ===============================================================
```

---

## 5. Dynamic Git Pre-Commit Security Scanner (`scripts/scan-secrets.sh`)

Rather than hardcoding specific domain strings into the security scanner, `scripts/scan-secrets.sh` **dynamically inspects** staged diffs using generic patterns for email addresses, route patterns, and API tokens.

### Dynamic Pre-Commit Script (`scripts/scan-secrets.sh`)

```bash
#!/bin/bash
# FormFlare Dynamic Pre-Commit Security Scanner
# Dynamically detects leaked credentials, email patterns, and domain route bindings in staged files.

ERRORS=0

echo "🔍 Running FormFlare Dynamic Security Scan on staged files..."

# 1. Check if .dev.vars or wrangler.local.toml are accidentally staged
STAGED_PRIVATE_FILES=$(git diff --cached --name-only | grep -E '^(\.dev\.vars|wrangler\.local\.toml)$')
if [ -n "$STAGED_PRIVATE_FILES" ]; then
    echo "❌ ERROR: Private configuration file(s) staged for commit:"
    echo "$STAGED_PRIVATE_FILES"
    echo "💡 Run 'git reset HEAD <file>' to unstage."
    ERRORS=$((ERRORS+1))
fi

# 2. Check for hardcoded API keys, Turnstile tokens, or secrets in any staged code
SECRET_PATTERNS='(0x4[A-Za-z0-9_-]{20,}|sk_live_[0-9a-zA-Z]{24,}|sk_test_[0-9a-zA-Z]{24,}|key-[0-9a-zA-Z]{32,})'
LEAKS=$(git diff --cached -U0 | grep -E "^\+" | grep -E "$SECRET_PATTERNS")
if [ -n "$LEAKS" ]; then
    echo "❌ ERROR: Detected potential secret API key or Turnstile token in staged code:"
    echo "$LEAKS"
    ERRORS=$((ERRORS+1))
fi

# 3. Dynamic check for hardcoded email addresses or domain route triggers in public wrangler.toml
if git diff --cached --name-only | grep -q 'wrangler\.toml$'; then
    # Dynamic Email Regex (catches any email address string in wrangler.toml)
    EMAIL_LEAKS=$(git diff --cached wrangler.toml | grep -E "^\+" | grep -E '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    if [ -n "$EMAIL_LEAKS" ]; then
        echo "❌ ERROR: Hardcoded email address detected in wrangler.toml:"
        echo "$EMAIL_LEAKS"
        echo "💡 Move private emails to Cloudflare Secrets (npx wrangler secret put EMAIL_FROM)."
        ERRORS=$((ERRORS+1))
    fi

    # Dynamic Domain Route Regex (catches any custom route patterns or zone_name definitions in wrangler.toml)
    ROUTE_LEAKS=$(git diff --cached wrangler.toml | grep -E "^\+" | grep -E '(pattern\s*=\s*".*"|zone_name\s*=\s*".*"|custom_domain\s*=\s*true)')
    if [ -n "$ROUTE_LEAKS" ]; then
        echo "❌ ERROR: Hardcoded custom domain route configuration detected in public wrangler.toml:"
        echo "$ROUTE_LEAKS"
        echo "💡 Move custom domain routes to Cloudflare Dashboard UI or untracked wrangler.local.toml."
        ERRORS=$((ERRORS+1))
    fi
fi

if [ $ERRORS -gt 0 ]; then
    echo "🚨 Security scan failed with $ERRORS error(s). Aborting commit."
    exit 1
fi

echo "✅ Dynamic security scan passed cleanly!"
exit 0
```

---

## 6. Implementation Action Plan

1. **Security Refactor**:
   * Clean `wrangler.toml`: Remove `API_KEY = "SECRET_API_KEY"`, `EMAIL_FROM`, `EMAIL_TO` from `[vars]`.
   * Create clean `.dev.vars.example`.
2. **Transparent Setup CLI**:
   * Create `scripts/setup.js` wizard with explicit file/resource summary manifest.
   * Add `"setup": "node scripts/setup.js"` to `package.json`.
3. **Dynamic Pre-Commit Hook**:
   * Add `scripts/scan-secrets.sh` with dynamic email & route pattern detectors.
4. **Lean Dev Logger**:
   * Add `DEV_MOCK_TURNSTILE` flag support in `src/turnstile.ts`.
   * Add `EMAIL_PROVIDER=console` stdout formatter in `src/email.ts`.
