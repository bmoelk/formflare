# FormFlare Setup Guide

This guide will walk you through setting up FormFlare from scratch.

## Prerequisites

- A Cloudflare account
- Node.js 18+ installed
- npm or yarn

## Step 1: Install Dependencies

```bash
cd formflare
npm install
```

## Step 2: Set Up Turnstile

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** in the sidebar
3. Click **Add Site**
4. Configure your site:
   - **Site name**: Your site name (e.g., "My Contact Form")
   - **Domain**: Your domain or `localhost` for testing
   - **Widget Mode**: Choose "Managed" (recommended)
5. Click **Create**
6. Copy your **Site Key** and **Secret Key**

## Step 3: Configure Local Development

1. Copy the example environment file:
```bash
cp .dev.vars.example .dev.vars
```

2. Edit `.dev.vars` and add your Turnstile secret key:
```
TURNSTILE_SECRET_KEY=your-actual-secret-key-here
```

## Step 4: Choose Your Storage Backend

### Option A: KV Storage (Simpler, good for small-medium volume)

1. Create a KV namespace:
```bash
wrangler kv namespace create "FORM_SUBMISSIONS"
```

2. Create a preview namespace for development:
```bash
wrangler kv namespace create "FORM_SUBMISSIONS" --preview
```

3. Update `wrangler.toml` with the namespace IDs from the output:
```toml
[[kv_namespaces]]
binding = "FORM_SUBMISSIONS"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### Option B: D1 Database (Recommended for production)

1. Create a D1 database:
```bash
wrangler d1 create formflare-db
```

2. Update `wrangler.toml` with the database ID from the output:
```toml
[[d1_databases]]
binding = "DB"
database_name = "formflare-db"
database_id = "your-database-id"
```

3. Create the database schema:
```bash
wrangler d1 execute formflare-db --file=./schema.sql
```

## Step 5: Test Locally

Start the development server:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

Test the health endpoint:
```bash
curl http://localhost:8787
```

## Step 6: Deploy to Cloudflare

1. Set your production Turnstile secret:
```bash
wrangler secret put TURNSTILE_SECRET_KEY
# Enter your secret key when prompted
```

2. Deploy the worker:
```bash
npm run deploy
```

3. Note your worker URL (e.g., `https://formflare.your-subdomain.workers.dev`)

## Step 7: Integrate with Your Website

1. Open `examples/example.html` in your editor

2. Update the configuration:
   - Replace `YOUR_TURNSTILE_SITE_KEY` with your Turnstile site key
   - Replace `https://your-worker.workers.dev/submit` with your actual worker URL

3. Upload `examples/example.html` to your static hosting (GitHub Pages, Netlify, etc.)

## Step 8: Environment Variables & Secrets Reference List

All configuration parameters and secrets supported by FormFlare are summarized below. You can specify non-sensitive environment variables in `.dev.vars` (or Cloudflare Dashboard), and sensitive secrets via `npx wrangler secret put KEY_NAME`.

| Variable / Secret Name | Kind | Required? | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Var | Optional | `production` | Deployment mode (`development` / `production`). |
| `ALLOWED_ORIGINS` | Var | Optional | `*` | Comma-separated list of allowed CORS origins (e.g. `https://example.com,https://staging.example.com`). |
| `RATE_LIMIT_ENABLED` | Var | Optional | `false` | Enable/disable IP rate limiting (`true` / `false`). |
| `RATE_LIMIT_REQUESTS` | Var | Optional | `10` | Max requests allowed per rate limit window per IP. |
| `RATE_LIMIT_WINDOW` | Var | Optional | `60` | Duration of rate limit window in seconds. |
| `EMAIL_PROVIDER` | Var | Optional | `none` | Outbound email provider (`none`, `console`, `resend`, `sendgrid`, `mailgun`, `mailtrap`). |
| `EMAIL_FROM` | Var/Secret | Required if email enabled | - | Outbound "From" email address (e.g. `contact@yourdomain.com`). |
| `EMAIL_TO` | Var/Secret | Required if email enabled | - | Target notification recipient email address (e.g. `alerts@yourdomain.com`). |
| `EMAIL_API_KEY` | Secret | Required if email != none/console | - | API key for Resend, SendGrid, Mailgun, or Mailtrap. |
| `TURNSTILE_SECRET_KEY` | Secret | Required for Turnstile | - | Global default Cloudflare Turnstile secret key. |
| `TURNSTILE_SECRET_KEY_${SITE_ID}` | Secret | Optional (Per-site) | - | Per-site Turnstile secret key (e.g. `TURNSTILE_SECRET_KEY_BRAINENDEAVOR`). |
| `API_KEY` | Secret | Optional | - | Bearer API token for admin GET endpoints (`/submissions`, `/submission/:id`). |
| `WEBHOOK_URL` | Var/Secret | Optional | - | Global fallback webhook POST URL triggered on submission events. |
| `WEBHOOK_URL_${SITE_ID}` | Var/Secret | Optional (Per-site) | - | Per-site webhook POST URL (e.g. `WEBHOOK_URL_BRAINENDEAVOR`). |
| `MAILGUN_DOMAIN` | Var/Secret | Optional (Mailgun) | - | Mailgun sending domain. |
| `MAILTRAP_INBOX_ID` | Var/Secret | Optional (Mailtrap) | - | Mailtrap inbox identifier. |

### Configuration Storage Rules

1. **`.dev.vars` (Git Ignored)**: Recommended for local dev and local deployment overrides (`ALLOWED_ORIGINS`, `EMAIL_PROVIDER`, `EMAIL_TO`).
2. **Wrangler KMS Secrets (`npx wrangler secret put`)**: Required for sensitive secrets (`TURNSTILE_SECRET_KEY_*`, `EMAIL_API_KEY`, `API_KEY`).
3. **`wrangler.toml`**: Public open-source template defaults only. Never put private email addresses or API keys in `wrangler.toml`.

## Step 9: Set Up Authentication for Admin Endpoints

The `/submissions/:formId` and `/submission/:id` endpoints require authentication.

1. Generate an API key:
```bash
openssl rand -hex 32
```

2. Store it as a secret:
```bash
wrangler secret put API_KEY
# Paste the generated key when prompted
```

3. Use it in your requests:
```bash
curl -H "Authorization: Bearer your-api-key" \
  https://your-worker.workers.dev/submissions/contact-form
```

## Step 10: Configure Webhooks (Optional)

You can configure FormFlare to send a JSON POST request to a webhook URL whenever a form is submitted successfully.

1. Set the webhook URL:
```bash
wrangler secret put WEBHOOK_URL
# Enter your webhook URL when prompted
```

The webhook payload will look like this:
```json
{
  "id": "submission-id",
  "formId": "contact-form",
  "data": { ... },
  "metadata": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Headers included:
- `X-FormFlare-Event`: `submission`
- `X-FormFlare-Signature`: Your `API_KEY` (if configured)

## Testing Your Setup

### Test Form Submission

```bash
curl -X POST https://your-worker.workers.dev/submit \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "test-form",
    "turnstileToken": "test-token",
    "data": {
      "name": "Test User",
      "email": "test@example.com",
      "message": "This is a test"
    }
  }'
```

Note: This will fail Turnstile verification unless you use a real token from the widget.

### View Submissions

```bash
curl -H "Authorization: Bearer your-api-key" \
  https://your-worker.workers.dev/submissions/test-form
```

### Test Email Configuration

You can test your email settings without submitting a form using the `/email-test` endpoint. This requires your API key.

```bash
curl -X POST https://your-worker.workers.dev/email-test \
  -H "Authorization: Bearer your-api-key"
```

If successful, you will receive a response like:
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "provider": "resend"
}
```
And check the configured email inbox for the test message.

## Troubleshooting

### "Turnstile verification failed"
- Make sure you're using the correct secret key
- Verify the token is fresh (tokens expire after a few minutes)
- Check that the domain matches your Turnstile configuration

### "Rate limit exceeded"
- Wait for the rate limit window to expire
- Adjust `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW` in `wrangler.toml`

### "No storage backend configured"
- Make sure you've uncommented and configured either KV or D1 in `wrangler.toml`
- Run `wrangler dev` to see if there are any binding errors

### CORS errors
- Add your domain to `ALLOWED_ORIGINS` in `wrangler.toml`
- Make sure you're using HTTPS in production

## Next Steps

- Set up email notifications for new submissions
- Create an admin dashboard to view submissions
- Implement custom validation rules
- Add file upload support

## Support

For issues and questions, please check the README.md file or create an issue in your repository.
