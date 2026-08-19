# FormFlare Agentic & Developer Guidelines (AGENTS.md)

This file defines coding standards, repository policies, and security guardrails for AI coding assistants (Antigravity, Claude Code, Cursor, Copilot) and human contributors working on **FormFlare**.

---

## 🔒 Zero-Secrets Public Repository Policy

> [!IMPORTANT]
> **FormFlare is an open-source public repository.**
> 
> 1. **`wrangler.toml` MUST remain 100% generic**:
>    - Never hardcode personal email addresses (`user@example.com`), custom domain origin lists (`ALLOWED_ORIGINS = "https://..."`), or production KV/D1 binding UUIDs inside `wrangler.toml`.
>    - `wrangler.toml` must contain only non-sensitive default placeholders (`ALLOWED_ORIGINS = "*"`, `EMAIL_PROVIDER = "none"`).
> 
> 2. **Environment Variable & Secret Overrides**:
>    - Local dev and deployment environment overrides belong in `.dev.vars` (which is listed in `.gitignore` and never committed).
>    - Production secrets (API keys, Turnstile secret keys) must be set via `npx wrangler secret put KEY_NAME` or the Cloudflare Dashboard KMS.

---

## 🏗 Multi-Tenant Architecture: Per-Site Resolution

1. **Explicit Site Identification**:
   - Web clients pass an explicit `siteId` attribute (e.g. `data-formflare-site="mysite"` or JS `FormFlare.init({ siteId: 'mysite' })`).
2. **Turnstile Secret Resolution**:
   - `c.env[`TURNSTILE_SECRET_KEY_${SITE_ID}`]` (e.g. `siteId: "mysite"` -> `TURNSTILE_SECRET_KEY_MYSITE`).
   - Fallback to `c.env.TURNSTILE_SECRET_KEY`.
   - Do NOT infer or split site prefixes from `formId`.
3. **Webhook URL Resolution**:
   - `c.env[`WEBHOOK_URL_${SITE_ID}`]` (e.g. `siteId: "mysite"` -> `WEBHOOK_URL_MYSITE`).
   - Fallback to `c.env.WEBHOOK_URL`.

---

## 🎨 Separation of Form Data vs. System Metadata

1. **System Metadata** (`formId`, `siteId`, `turnstileToken`) must be specified via `<form>` dataset attributes (`data-formflare`, `data-formflare-site`) or client JS config—**never via hidden HTML `<input>` tags**.
2. Hidden HTML `<input>` tags inside forms are reserved strictly for user/business form payload data.

---

## 🧪 Security & Pre-Commit Scanner

Before pushing any changes, run the security scanner:
```bash
npm run scan-secrets
```
