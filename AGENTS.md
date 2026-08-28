# FreeFormer Agentic & Developer Guidelines (AGENTS.md)

This file defines coding standards, repository policies, and security guardrails for AI coding assistants (Antigravity, Claude Code, Cursor, Copilot) and human contributors working on **FreeFormer**.

---

## 🔒 Zero-Secrets Public Repository Policy

> [!IMPORTANT]
> **FreeFormer is an open-source public repository.**
> 
> 1. **`wrangler.toml` MUST remain 100% generic**:
>    - Never hardcode personal email addresses (`user@example.com`), custom domain origin lists (`ALLOWED_ORIGINS = "https://..."`), or production KV/D1 binding UUIDs inside `wrangler.toml`.
>    - `wrangler.toml` must contain only non-sensitive default placeholders (`ALLOWED_ORIGINS = "*"`, `EMAIL_PROVIDER = "none"`).
> 
> 2. **Environment Variable & Secret Overrides**:
>    - Local dev and offline testing overrides belong in `.dev.vars` (git-ignored).
>    - Production secrets (API keys, Turnstile secret keys) must be set via `npx wrangler secret put KEY_NAME` or Cloudflare Dashboard KMS.
> 
> 3. **Private Production Deployments (`wrangler.overrides.toml`)**:
>    - Account-specific production bindings (e.g. `KV` namespace ID, `DB` database ID, private `ALLOWED_ORIGINS`, and production `EMAIL_TO`) MUST be specified in `wrangler.overrides.toml` (git-ignored).
>    - Deploy to your private account using:
>      ```bash
>      npx wrangler deploy -c wrangler.overrides.toml
>      ```
>    - Never modify tracked `wrangler.toml` with personal/account values.

---

## 🏗 Multi-Tenant Architecture: Per-Site Resolution

1. **Site Identification (`siteId`)**:
   - Explicit attribute on forms (e.g. `data-freeformer-site="splitphase.io"` or `FreeFormer.init({ siteId: 'splitphase.io' })`).
   - If omitted, automatically derived from the hosting page's hostname (e.g. `window.location.hostname` or HTTP `Origin`/`Referer` -> `splitphase.io`).
   - Standardized to lowercase string across KV keys (`submission:splitphase.io:...`) and SQL queries (`WHERE site_id = 'splitphase.io'`).
2. **Smart Secret & Variable Resolution**:
   - Normalizes domain delimiters to underscore and alphanumeric patterns:
     - `siteId: "splitphase.io"` checks:
       1. `KEY_SPLITPHASE_IO` (exact with underscores)
       2. `KEY_SPLITPHASEIO` (alphanumeric only)
       3. `KEY_SPLITPHASE` (base domain prefix)
       4. `KEY` (global fallback)
   - Applies to `TURNSTILE_SECRET_KEY`, `EMAIL_TO`, `EMAIL_FROM`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `MAILGUN_DOMAIN`, `MAILTRAP_INBOX_ID`, `WEBHOOK_URL`.
   - Do NOT infer or split site prefixes from `formId`.
3. **Unified Storage Architecture & Multi-Tenancy**:
   - Single storage engine configured globally via `STORAGE_ENGINE` (`"kv"`, `"d1"`, `"none"`).
   - KV Storage: Uses a single global `KV` binding (`[[kv_namespaces]] binding = "KV"`). Submissions are partitioned by key: `submission:${siteId}:${formId}:${submissionId}` and index `index:${siteId}:${formId}`.
   - D1 Storage: Uses a single global `DB` binding (`[[d1_databases]] binding = "DB"`). Submissions are partitioned by SQL column: `WHERE form_id = ? AND site_id = ?`.

---

## 🎨 Separation of Form Data vs. System Metadata

1. **System Metadata** (`formId`, `siteId`, `turnstileToken`) must be specified via `<form>` dataset attributes (`data-freeformer`, `data-freeformer-site`) or client JS config—**never via hidden HTML `<input>` tags**.
2. Hidden HTML `<input>` tags inside forms are reserved strictly for user/business form payload data.

---

## 🧪 Pre-Commit Quality Gate & Security Scanner

Before creating any git commits, FreeFormer runs an automated quality gate (`npm run pre-commit` / `bash scripts/scan-secrets.sh`). Commits are automatically blocked if any of the following 4 checks fail:

1. **Documentation & Manifest Sync Check (`scripts/sync-docs.js --check`)**:
   - Verifies that the reference table in `docs/SETUP.md` matches `config-manifest.json` exactly.
   - *Fix*: Run `npm run sync-docs` to re-sync documentation.
2. **Private File Staging Check**:
   - Blocks accidental staging of `.dev.vars`, `wrangler.overrides.toml`, or `wrangler.local.toml`.
   - *Fix*: Run `git reset HEAD <file>` to unstage.
3. **Hardcoded Secrets & API Token Scanner**:
   - Scans all staged code diffs for secret key signatures (Turnstile `0x4...`, Stripe `sk_live_...`, generic API keys `key-...`).
   - *Fix*: Move sensitive credentials to Cloudflare KMS via `npx wrangler secret put`.
4. **Public `wrangler.toml` Sanitization**:
   - Ensures `wrangler.toml` contains no personal email addresses (`user@...`) or hardcoded custom domain route patterns (`pattern = "..."`, `custom_domain = true`).
   - *Fix*: Move custom routes and private configurations to `wrangler.overrides.toml`.

```bash
# Run manual pre-commit check
npm run pre-commit
```

---

## 🚀 Post-Deployment Verification & Key Cross-Referencing

After running deployments (`npm run deploy:prod` / `npx wrangler deploy -c wrangler.overrides.toml`), FreeFormer runs `scripts/verify-deploy.js` to execute live health checks:

1. **Live Binding Diagnostics (`GET /`)**: Verifies KV/D1 storage, email provider, and Turnstile secrets on the remote Worker isolate.
2. **Local vs. Remote Key Cross-Referencing**:
   - Parses local `.dev.vars` and `wrangler.overrides.toml` to extract all tested configuration keys (`TURNSTILE_SECRET_KEY_${SITE_ID}`, `EMAIL_TO_${SITE_ID}`, `WEBHOOK_URL_${SITE_ID}`).
   - Cross-references against `configuredKeys` from the remote Worker's `GET /` diagnostic payload.
   - Flags any key tested locally that has not yet been set in Cloudflare (`npx wrangler secret put KEY_NAME`).

```bash
# Run manual post-deployment verification
npm run verify-deploy
```
