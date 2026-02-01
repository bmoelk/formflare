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
wrangler kv:namespace create "FORM_SUBMISSIONS"
```

2. Create a preview namespace for development:
```bash
wrangler kv:namespace create "FORM_SUBMISSIONS" --preview
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

1. Open `example.html` in your editor

2. Update the configuration:
   - Replace `YOUR_TURNSTILE_SITE_KEY` with your Turnstile site key
   - Replace `https://your-worker.workers.dev/submit` with your actual worker URL

3. Upload `example.html` to your static hosting (GitHub Pages, Netlify, etc.)

## Step 8: Configure CORS (Optional)

For production, you should restrict which domains can submit forms:

1. Edit `wrangler.toml`:
```toml
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com,https://www.yourdomain.com"
```

2. Redeploy:
```bash
npm run deploy
```

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
- Add webhook support to integrate with other services
- Implement custom validation rules
- Add file upload support

## Support

For issues and questions, please check the README.md file or create an issue in your repository.
