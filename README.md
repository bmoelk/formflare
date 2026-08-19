# FormFlare 🚀

**A powerful, spam-protected form backend for static websites built on Cloudflare Workers, Hono, and D1/KV**

FormFlare provides a complete, edge-native backend for collecting form submissions from static websites. It combines Cloudflare Turnstile spam protection with flexible storage, rate limiting, and local DX mocking.

---

## ✨ Key Features

* 🛡️ **Turnstile Integration** — Built-in spam protection using Cloudflare Turnstile (with local dev auto-mocking).
* 💾 **Flexible Storage** — Choose between Cloudflare KV (key-value) or D1 (SQLite SQL) databases.
* 🔗 **Webhooks & Real-time Dispatch** — Trigger HTTP POST webhooks on form submissions with global (`WEBHOOK_URL`) and per-site (`WEBHOOK_URL_${SITE_ID}`) routing.
* 🛠️ **Interactive Setup Wizard** — Run `npm run setup` for guided configuration and clear manifest summaries.
* 🔒 **Zero-Secrets Security Architecture** — 100% safe for public Git repositories; no credentials in `wrangler.toml`.
* 🔍 **Pre-Commit Security Scanner** — Automated scanner (`npm run scan-secrets`) to block staged credential leaks.
* 📧 **Multi-Provider Email Alerts & Mustache Templates** — Outbound email notifications with customizable Mustache templates (`src/templates/email.html.mustache`) via Resend, SendGrid, Mailgun, Mailtrap, or local console logger (`EMAIL_PROVIDER=console`).
* ⚡ **Edge Performance** — Sub-50ms global response times on Cloudflare's edge network.

---

## 📚 Documentation Index

All detailed guides and architecture references are maintained in the [`docs/`](docs/) directory:

* 📖 **[SECURITY_AND_DX.md](docs/SECURITY_AND_DX.md)** — Security architecture, secrets rulebook, setup wizard, & pre-commit scanner.
* 📡 **[API_ENDPOINTS.md](docs/API_ENDPOINTS.md)** — Complete REST API specification, headers, and payload samples.
* 📋 **[SETUP.md](docs/SETUP.md)** — Step-by-step setup and deployment guide.
* 📑 **[PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** — Comprehensive architecture and project overview.
* ⚡ **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** — API endpoints, payloads, and quick commands.
* ✉️ **[EMAIL_NOTIFICATIONS.md](docs/EMAIL_NOTIFICATIONS.md)** — Provider setup (Resend, SendGrid, Mailgun, Mailtrap, Console).
* 🌐 **[MULTIPLE_SITES.md](docs/MULTIPLE_SITES.md)** — Supporting multiple client domains and forms.
* 💻 **[CLIENT_LIBRARY.md](docs/CLIENT_LIBRARY.md)** — Client JavaScript library reference.

---

## 🚀 Quick Start

### 1. Install & Configure

```bash
# Install dependencies
npm install

# Run interactive setup wizard
npm run setup
```

### 2. Run Local Development Server

```bash
# Start local dev server (uses local D1/KV SQLite mock & stdout email logger)
npm run dev
```

FormFlare will start locally at `http://localhost:8787`.

### 3. Deploy to Cloudflare

```bash
# Set production secrets in Cloudflare KMS
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put API_KEY

# Deploy to Cloudflare Workers / Pages
npm run deploy
```

---

### 🎨 Frontend Integration

FormFlare offers two clean ways to integrate with your static website:

#### Method 1: Built-in Client Library (Recommended)

The easiest way to integrate FormFlare is to load the built-in client library script served directly by your Worker:

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
        
        <!-- Turnstile widget will be injected automatically -->
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

        // Optional: Listen to submission events
        document.getElementById('contact-form').addEventListener('formflare:success', (e) => {
            console.log('Submitted!', e.detail.submissionId);
        });
    </script>
</body>
</html>
```

#### Method 2: Manual API Fetch Integration

For complete custom control, you can post directly to the `/submit` endpoint:

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
            alert('Please complete the anti-spam verification');
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

---

## 🔗 Webhook Notifications

FormFlare can dispatch HTTP POST requests to webhooks whenever a valid form submission is received.

### 1. Configuration & Secret Keys

Set webhooks globally or per-site using Wrangler secrets or `.dev.vars`:

```bash
# Global fallback webhook
npx wrangler secret put WEBHOOK_URL

# Per-site webhook URL (e.g. siteId: "brainendeavor")
npx wrangler secret put WEBHOOK_URL_BRAINENDEAVOR
```

### 2. Webhook JSON Payload

```json
{
  "id": "sub_123456789",
  "formId": "contact",
  "siteId": "brainendeavor",
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Hello from static site!"
  },
  "timestamp": "2026-08-18T21:58:00.000Z"
}
```

### 3. Headers Sent
* `Content-Type`: `application/json`
* `X-FormFlare-Event`: `submission`
* `X-FormFlare-Signature`: `API_KEY` (if `API_KEY` secret is configured)

---

## 🔍 Pre-Commit Security Scanner

Before committing code, run the dynamic security scanner to verify zero credential or route leaks:

```bash
npm run scan-secrets
```

---

## 📄 License

MIT © [Brian Moelk](https://github.com/bmoelk)
