# FormFlare 🚀

**A powerful, spam-protected form backend for static websites**

FormFlare is a Cloudflare Worker that provides a complete backend solution for collecting form submissions from static websites. It combines Cloudflare's Turnstile spam protection with flexible storage options, making it perfect for contact forms, newsletter signups, feedback forms, and more.

## ✨ Features

- 🛡️ **Turnstile Integration** - Built-in spam protection using Cloudflare Turnstile (CAPTCHA alternative)
- 💾 **Flexible Storage** - Choose between Cloudflare KV (simple) or D1 (SQL) databases
- 🚦 **Rate Limiting** - Optional IP-based rate limiting with configurable limits
- 📧 **Email Notifications** - Automatic email alerts via Resend, SendGrid, or Mailgun
- 🌐 **CORS Support** - Easy integration with any static website
- 🔐 **Secure** - API key authentication for retrieving submissions
- ⚡ **Fast** - Runs on Cloudflare's global edge network (200+ locations)
- 📊 **Multiple Forms** - Support unlimited forms with unique identifiers
- 💰 **Free Tier** - Runs completely free for most small-medium websites
- 🎨 **Beautiful Examples** - Includes ready-to-use HTML examples
- 📚 **Client Library** - Optional JavaScript library for easier integration

## 📚 Documentation

- **[PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** - Comprehensive project overview and architecture
- **[SETUP.md](docs/SETUP.md)** - Step-by-step setup and deployment guide
- **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - Quick reference for common tasks and API usage
- **[EMAIL_NOTIFICATIONS.md](docs/EMAIL_NOTIFICATIONS.md)** - Email notification setup and configuration
- **[CLIENT_LIBRARY.md](docs/CLIENT_LIBRARY.md)** - Client library API reference and examples
- **[MULTIPLE_SITES.md](docs/MULTIPLE_SITES.md)** - Guide for supporting multiple websites

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Storage

#### Option A: Using KV (Simple, good for small-medium volume)

```bash
# Create KV namespace
npx wrangler kv namespace create "FORM_SUBMISSIONS"
npx wrangler kv namespace create "FORM_SUBMISSIONS" --preview

# Update wrangler.toml with the namespace IDs
```

#### Option B: Using D1 (Recommended for complex queries)

```bash
# Create D1 database
npx wrangler d1 create formflare-db

# Create the schema
npx wrangler d1 execute formflare-db --file=./schema.sql

# Update wrangler.toml with the database ID
```

### 3. Set Up Turnstile

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Turnstile
3. Create a new site
4. Copy your site key and secret key

```bash
# Set the secret key
npx wrangler secret put TURNSTILE_SECRET_KEY
# enter secret key value when prompted
```

### 4. Deploy

```bash
# Deploy to Cloudflare
npm run deploy
```

### Frontend Integration

FormFlare offers two ways to integrate with your static website:

#### Method 1: Using the FormFlare Client Library (Recommended)

The easiest way to integrate FormFlare is to use the built-in client library:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Contact Form</title>
</head>
<body>
    <!-- Add data-formflare attribute with your form ID -->
    <form id="contact-form" data-formflare="contact-form">
        <input type="text" name="name" placeholder="Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <textarea name="message" placeholder="Message" required></textarea>
        
        <!-- Turnstile widget will be added automatically -->
        
        <button type="submit">Submit</button>
    </form>

    <!-- Load FormFlare client library from your worker -->
    <script src="https://your-worker.workers.dev/form-handler.js"></script>
    
    <!-- Initialize FormFlare -->
    <script>
        FormFlare.init({
            workerUrl: 'https://your-worker.workers.dev',
            turnstileSiteKey: 'YOUR_SITE_KEY',
            autoInit: true  // Automatically handles forms with data-formflare
        });

        // Optional: Listen to events
        document.getElementById('contact-form').addEventListener('formflare:success', (e) => {
            console.log('Submitted!', e.detail.submissionId);
        });
    </script>
</body>
</html>
```

**Benefits:**
- ✅ Automatic Turnstile widget injection
- ✅ Built-in error handling and user feedback
- ✅ Custom events for success/error handling
- ✅ No need to manually handle tokens
- ✅ Cleaner, more maintainable code

See `example-with-library.html` for a complete example.

#### Method 2: Manual Integration

For more control, you can manually integrate with the API:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Contact Form</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
    <form id="contact-form">
        <input type="text" name="name" placeholder="Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <textarea name="message" placeholder="Message" required></textarea>
        
        <!-- Turnstile widget -->
        <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
        
        <button type="submit">Submit</button>
    </form>

    <script>
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const turnstileToken = turnstile.getResponse();
        
        if (!turnstileToken) {
            alert('Please complete the verification');
            return;
        }
        
        const response = await fetch('https://your-worker.workers.dev/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                formId: 'contact-form',
                turnstileToken: turnstileToken,
                data: data,
            }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Form submitted successfully!');
            e.target.reset();
            turnstile.reset();
        } else {
            alert('Error: ' + result.error);
        }
    });
    </script>
</body>
</html>
```

See `example.html` for a complete example.

## API Endpoints

### GET `/`

Health check endpoint.

**Response:**
```json
{
  "service": "FormFlare",
  "version": "1.0.0",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET `/form-handler.js`

Serves the FormFlare client library JavaScript file.

**Response:** JavaScript file with `Content-Type: application/javascript`

**Usage:**
```html
<script src="https://your-worker.workers.dev/form-handler.js"></script>
```

This endpoint serves the client library with proper caching headers (`Cache-Control: public, max-age=3600`) and CORS headers for easy integration from any domain.

### POST `/submit`

Submit a form with Turnstile verification.

**Request:**
```json
{
  "formId": "contact-form",
  "turnstileToken": "token-from-widget",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello!"
  }
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "abc123",
  "message": "Form submitted successfully"
}
```

### GET `/submissions/:formId`

Get all submissions for a specific form (requires authentication).

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "success": true,
  "formId": "contact-form",
  "submissions": [
    {
      "id": "abc123",
      "formId": "contact-form",
      "data": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "metadata": {
        "ip": "1.2.3.4",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "turnstileScore": 0.9
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### GET `/submission/:id`

Get a specific submission by ID (requires authentication).

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

## Configuration

### Environment Variables

Set in `wrangler.toml` or via `wrangler secret put`:

- `TURNSTILE_SECRET_KEY` - Your Turnstile secret key (use secrets)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins (default: "*")
- `RATE_LIMIT_REQUESTS` - Max requests per window (default: 10)
- `RATE_LIMIT_WINDOW` - Rate limit window in seconds (default: 60)

### Storage Options

**KV Namespace:**
- Good for simple storage needs
- Easy to set up
- Limited query capabilities

**D1 Database:**
- Better for complex queries
- More efficient for large volumes
- Requires schema setup

## Development

```bash
# Start local development server
npm run dev

# Deploy to production
npm run deploy

# View logs
npm run tail
```

## Security Considerations

1. **API Authentication**: Implement proper API key management for the retrieval endpoints
2. **CORS**: Configure `ALLOWED_ORIGINS` to restrict access to your domains
3. **Rate Limiting**: Adjust rate limits based on your needs
4. **Data Validation**: Add additional validation for form data as needed
5. **Secrets Management**: Always use `wrangler secret` for sensitive values

## License

MIT
