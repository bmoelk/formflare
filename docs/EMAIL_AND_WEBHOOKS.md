# FreeFormer Outbound Delivery Guide: Emails & Webhooks 📧🔗

This guide covers configuring email notifications and real-time outbound webhooks for form submissions.

---

## 1. Email Notifications

FreeFormer supports multiple outbound email providers configured via environment variables and Cloudflare KMS secrets.

### Supported Providers (`EMAIL_PROVIDER`)

| Provider | `EMAIL_PROVIDER` | Required Credentials | Notes |
| :--- | :--- | :--- | :--- |
| **Mailtrap** *(Default)* | `mailtrap` | `EMAIL_API_KEY`, `EMAIL_TO` | High deliverability transactional email API. |
| **Resend** | `resend` | `EMAIL_API_KEY`, `EMAIL_TO` | Modern developer email API. |
| **SendGrid** | `sendgrid` | `EMAIL_API_KEY`, `EMAIL_TO` | Twilio SendGrid v3 Mail Send API. |
| **Mailgun** | `mailgun` | `EMAIL_API_KEY`, `EMAIL_TO`, `MAILGUN_DOMAIN` | Mailgun Messages API. |
| **Console Logger** | `console` | None | Prints formatted submission tables to Worker stdout (`wrangler tail`). |
| **Disabled** | `none` | None | Skips email dispatching entirely. |

### Global vs. Per-Site Multi-Tenant Email Routing

FreeFormer allows you to configure global fallback email settings as well as site-specific recipient and sender overrides using `siteId`:

* **Global Defaults**: `EMAIL_TO`, `EMAIL_FROM`, `EMAIL_PROVIDER`
* **Per-Site Overrides**: `EMAIL_TO_${SITE_ID}`, `EMAIL_FROM_${SITE_ID}`, `EMAIL_PROVIDER_${SITE_ID}` (e.g. `EMAIL_TO_MYSITE_A=team-a@example.com`, `EMAIL_TO_MYSITE_B=team-b@example.com`).

```toml
# Example wrangler.overrides.toml with per-site email targets
[vars]
EMAIL_PROVIDER = "mailtrap"
EMAIL_TO = "default-alerts@example.com"
EMAIL_TO_BRAINENDEAVOR = "brian@brainendeavor.com"
EMAIL_TO_SPLITPHASE = "brian@splitphase.com"
```

Set your provider API key as a secure secret:
```bash
npx wrangler secret put EMAIL_API_KEY
```

---

## 2. Mustache Email Templates

Email templates are logic-less Mustache files located in `src/templates/`:

* **HTML Template**: [`src/templates/email.html.mustache`](file:///Users/bmo/code/websites/freeformer/src/templates/email.html.mustache)
* **Plaintext Fallback**: [`src/templates/email.text.mustache`](file:///Users/bmo/code/websites/freeformer/src/templates/email.text.mustache)

### System Token Filtering
FreeFormer automatically sanitizes system tokens (`cf-turnstile-response`, `turnstileToken`, `formId`, `siteId`) so only actual user form input data appears in the `{{#fields}}` template loop.

### Template Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| `{{formId}}` | Identifier of submitted form | `contact-form` |
| `{{submissionId}}` | Unique ID of submission | `sub_9a8b7c6d5e` |
| `{{timestamp}}` | UTC submission timestamp | `Tue, 19 Aug 2026 10:00:00 GMT` |
| `{{ip}}` | Client IP address | `192.168.1.1` |
| `{{#turnstileScore}}...{{/turnstileScore}}` | Conditional Turnstile spam score | `0.95` |
| `{{#fields}} {{key}} : {{value}} {{/fields}}` | Sanitized array of user submission fields | `[ { key: "name", value: "Jane" } ]` |

---

## 3. Outbound Webhooks

FreeFormer can trigger real-time HTTP POST webhooks on successful form submissions.

### Webhook Configuration

* **Global Fallback**: Set `WEBHOOK_URL` via `npx wrangler secret put WEBHOOK_URL`.
* **Per-Site Webhook**: Set `WEBHOOK_URL_${SITE_ID}` (e.g. `WEBHOOK_URL_MYSITE`) via `npx wrangler secret put WEBHOOK_URL_MYSITE`.

### Webhook Payload Format

```json
{
  "id": "sub_9a8b7c6d5e",
  "formId": "contact",
  "siteId": "mysite",
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Hello from FreeFormer!"
  },
  "metadata": {
    "ip": "203.0.113.195",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2026-08-19T10:00:00.000Z",
    "turnstileScore": 1.0
  }
}
```

### Webhook HTTP Headers
* `Content-Type: application/json`
* `X-FreeFormer-Event: submission`
* `X-FreeFormer-Signature: <API_KEY>` *(Included if `API_KEY` is configured for signature authentication)*
