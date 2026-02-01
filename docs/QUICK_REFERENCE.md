# FormFlare Quick Reference

## API Endpoints

### POST /submit
Submit a form with Turnstile verification.

```javascript
fetch('https://your-worker.workers.dev/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formId: 'my-form',
    turnstileToken: 'token-from-widget',
    data: { name: 'John', email: 'john@example.com' }
  })
})
```

### GET /submissions/:formId
Get all submissions for a form (requires auth).

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-worker.workers.dev/submissions/my-form?limit=50&offset=0
```

### GET /submission/:id
Get a specific submission (requires auth).

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-worker.workers.dev/submission/abc123
```

## HTML Integration

### Basic Setup

```html
<!-- 1. Add Turnstile script -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<!-- 2. Add form with Turnstile widget -->
<form id="my-form">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  
  <!-- Turnstile widget -->
  <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
  
  <button type="submit">Submit</button>
</form>

<!-- 3. Handle submission -->
<script>
document.getElementById('my-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const token = turnstile.getResponse();
  
  const response = await fetch('https://your-worker.workers.dev/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formId: 'my-form',
      turnstileToken: token,
      data: data
    })
  });
  
  const result = await response.json();
  if (result.success) {
    alert('Success!');
    e.target.reset();
    turnstile.reset();
  }
});
</script>
```

## Configuration

### wrangler.toml

```toml
# KV Storage
[[kv_namespaces]]
binding = "FORM_SUBMISSIONS"
id = "your-kv-id"

# OR D1 Storage
[[d1_databases]]
binding = "DB"
database_name = "formflare-db"
database_id = "your-db-id"

# Environment Variables
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com"
RATE_LIMIT_REQUESTS = "10"
RATE_LIMIT_WINDOW = "60"
```

### Secrets

```bash
# Set Turnstile secret
wrangler secret put TURNSTILE_SECRET_KEY

# Set API key for admin endpoints
wrangler secret put API_KEY
```

## Common Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Deploy to production
npm run deploy

# View logs
npm run tail

# Create KV namespace
wrangler kv:namespace create "FORM_SUBMISSIONS"

# Create D1 database
wrangler d1 create formflare-db

# Run D1 migrations
wrangler d1 execute formflare-db --file=./schema.sql

# Set secrets
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put API_KEY
```

## Response Formats

### Success Response

```json
{
  "success": true,
  "submissionId": "abc123",
  "message": "Form submitted successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Turnstile verification failed",
  "details": ["invalid-input-response"]
}
```

### Rate Limit Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

## Turnstile Error Codes

- `missing-input-secret` - Secret key is missing
- `invalid-input-secret` - Secret key is invalid
- `missing-input-response` - Token is missing
- `invalid-input-response` - Token is invalid or expired
- `bad-request` - Request is malformed
- `timeout-or-duplicate` - Token has already been used

## Rate Limiting

Enable/disable rate limiting:
```toml
[vars]
RATE_LIMIT_ENABLED = "true"  # Set to "false" to disable
RATE_LIMIT_REQUESTS = "10"
RATE_LIMIT_WINDOW = "60"
```

Default: 10 requests per 60 seconds per IP address (when enabled)

## CORS Configuration

Allow all origins (development only):
```toml
[vars]
ALLOWED_ORIGINS = "*"
```

Allow specific origins (production):
```toml
[vars]
ALLOWED_ORIGINS = "https://example.com,https://www.example.com"
```

## Storage Comparison

| Feature | KV | D1 |
|---------|----|----|
| Setup Complexity | Simple | Moderate |
| Query Capabilities | Limited | Full SQL |
| Best For | Small-medium volume | Large volume, complex queries |
| Cost | Pay per operation | Pay per query |
| Performance | Very fast | Fast |

## Security Checklist

- ✅ Set `TURNSTILE_SECRET_KEY` as a secret
- ✅ Configure `ALLOWED_ORIGINS` for production
- ✅ Set up API key authentication
- ✅ Enable rate limiting
- ✅ Use HTTPS in production
- ✅ Validate and sanitize form data
- ✅ Monitor submission logs

## Troubleshooting

**Turnstile fails**: Check secret key, domain configuration, token freshness

**CORS errors**: Add your domain to `ALLOWED_ORIGINS`

**Rate limited**: Adjust limits or wait for window to expire

**Storage errors**: Verify KV/D1 bindings in `wrangler.toml`

**No submissions saved**: Check storage backend is configured and bound correctly
