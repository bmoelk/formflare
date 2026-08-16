# FormFlare Security Architecture, DX & Setup Guide

**Repository**: `formflare` (`/Users/bmo/code/websites/formflare`)

---

## 1. Security Architecture & Secrets Rulebook

FormFlare is designed to be 100% safe for public open-source Git repositories. Cloudflare Workers enforces a strict boundary between public configuration variables (`[vars]` in `wrangler.toml`), local dev overrides (`.dev.vars`), and production encrypted secrets (`wrangler secret put`).

### Configuration Matrix

| Config Category | Scope & Sensitivity | Required vs. Optional | Local Dev (Miniflare / Wrangler) | Production Deployment (Cloudflare) |
| :--- | :--- | :--- | :--- | :--- |
| **A. Secret Keys & Tokens** | Sensitive (`TURNSTILE_SECRET_KEY`, `EMAIL_API_KEY`, `API_KEY`) | **Required**: Turnstile & API Key.<br />**Optional**: Email API Key. | Root `.dev.vars` (Git-ignored) | Cloudflare KMS (`npx wrangler secret put`) |
| **B. Private Settings** | Sensitive (`EMAIL_FROM`, `EMAIL_TO`, `WEBHOOK_URL`) | **Optional**: Required only if emails enabled. | Root `.dev.vars` (Git-ignored) | Cloudflare KMS (`npx wrangler secret put`) |
| **C. Public Options** | Non-sensitive (`ALLOWED_ORIGINS`, `RATE_LIMIT_*`, `EMAIL_PROVIDER`) | **Required**: System defaults. | `wrangler.toml` `[vars]` or `.dev.vars` | `wrangler.toml` `[vars]` |
| **D. Resource UUIDs** | Infra IDs (`D1 Database ID`, `KV Namespace ID`) | **Optional** in dev.<br />**Required** in prod. | **Auto-mocked in local SQLite** (`.wrangler/state/`) | Cloudflare Dashboard or `wrangler.local.toml` |
| **E. Domain Routes** | Triggers (`pattern = "contact.example.com"`) | **Optional** (defaults to `*.workers.dev`). | `localhost:8787` | Cloudflare Dashboard (Custom Domains) or `wrangler.local.toml` |

---

## 2. Environment Setup

### A. Public Configuration (`wrangler.toml`)
`wrangler.toml` contains **ONLY** generic, non-sensitive default values that are safe to share publicly in Git repositories.

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

### B. Local Development (`.dev.vars`)
When running `npx wrangler dev`, Miniflare automatically injects `.dev.vars` into the worker runtime context (`c.env`). Local dev requires **zero external cloud setup**; D1 and KV are automatically mocked in local SQLite files (`.wrangler/state/v3/d1`).

```ini
# .dev.vars (Git-ignored)
ENVIRONMENT=development
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

### C. Production Cloudflare Secrets & Custom Domain Routes

To deploy FormFlare to production without modifying source code:

1. **Set Secrets in Cloudflare KMS**:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY   # Required
   npx wrangler secret put API_KEY                # Required for GET /submissions
   npx wrangler secret put EMAIL_API_KEY          # Required if EMAIL_PROVIDER != 'none'
   npx wrangler secret put EMAIL_FROM             # Required if EMAIL_PROVIDER != 'none'
   npx wrangler secret put EMAIL_TO               # Required if EMAIL_PROVIDER != 'none'
   npx wrangler secret put WEBHOOK_URL            # Optional
   ```

2. **Set Custom Domains (No Code Edits)**:
   Navigate to **Cloudflare Dashboard > Workers & Pages > formflare > Triggers > Custom Domains** and add `contact.example.com`.

3. **Untracked Domain Routes (`wrangler.local.toml` Alternative)**:
   For teams preferring CLI-driven domain binding, use an untracked config (`.gitignore`'d):
   ```toml
   # wrangler.local.toml
   name = "formflare-custom"
   
   [[routes]]
   pattern = "contact.example.com"
   custom_domain = true
   ```
   Deploy via: `npx wrangler deploy -c wrangler.local.toml`

---

## 3. Transparent Interactive Setup Wizard (`npm run setup`)

FormFlare includes an interactive terminal setup wizard (`scripts/setup.js`). Run:

```bash
npm run setup
```

### Setup Manifest Output
At completion, the setup wizard prints a transparent manifest detailing all modified files and Cloudflare KMS secret instructions:

```text
========================================================================
📋 SETUP MANIFEST & MODIFIED RESOURCES SUMMARY
========================================================================
  [FILE CREATED / UPDATED]  .dev.vars
  Path:              /path/to/formflare/.dev.vars
  Config Summary:    DEV_MODE=true, EMAIL_PROVIDER=console, ...
  ----------------------------------------------------------------------

📌 NEXT STEPS:
  • Local dev:     npx wrangler dev
  • Inspect status: git status
========================================================================
```

---

## 4. Dynamic Git Pre-Commit Security Scanner (`npm run scan-secrets`)

To guarantee private credentials, personal emails, or domain routes are never committed, FormFlare includes an automated pre-commit scanner (`scripts/scan-secrets.sh`).

### Pre-Commit Script Features:
* **Staged Private Files**: Detects if `.dev.vars` or `wrangler.local.toml` are staged.
* **Secret API Key Patterns**: Scans for Turnstile keys (`0x4...`), API tokens (`sk_live_...`, `sk_test_...`), and Bearer header credentials.
* **Dynamic `wrangler.toml` Scanner**: Dynamically checks for hardcoded email addresses (`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`) or custom route patterns without hardcoding specific domain names.

### Hook Installation:
```bash
chmod +x scripts/scan-secrets.sh
cp scripts/scan-secrets.sh .git/hooks/pre-commit
```
Or run directly:
```bash
npm run scan-secrets
```
