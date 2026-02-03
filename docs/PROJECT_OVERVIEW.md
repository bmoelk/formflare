# FormFlare Project Overview

## What is FormFlare?

FormFlare is a **Cloudflare Worker** that provides a backend for static websites to collect and store form submissions. It includes built-in **Cloudflare Turnstile** spam protection, making it perfect for contact forms, newsletter signups, feedback forms, and more.

## Key Features

✅ **Turnstile Integration** - Automatic spam protection using Cloudflare's Turnstile  
✅ **Flexible Storage** - Supports both Cloudflare KV and D1 databases  
✅ **Rate Limiting** - Prevents abuse with configurable IP-based rate limits  
✅ **CORS Support** - Easy integration with any static website  
✅ **Multiple Forms** - Support for multiple forms with unique identifiers  
✅ **Secure** - API key authentication for retrieving submissions  
✅ **Fast** - Runs on Cloudflare's global edge network  
✅ **TypeScript** - Fully typed with TypeScript for better development experience  

## Project Structure

```
formflare/
├── src/
│   ├── index.ts          # Main Hono application with API endpoints
│   ├── turnstile.ts      # Turnstile verification logic
│   ├── storage.ts        # KV and D1 storage implementations
│   └── ratelimit.ts      # Rate limiting logic
├── examples/
│   ├── example.html          # Simple contact form example
│   └── example-advanced.html # Advanced example with multiple forms
├── schema.sql            # D1 database schema
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
├── wrangler.toml         # Cloudflare Worker configuration
├── .dev.vars.example     # Example environment variables
├── README.md             # Main documentation
├── SETUP.md              # Step-by-step setup guide
└── QUICK_REFERENCE.md    # Quick reference for common tasks
```

## How It Works

### 1. User Fills Out Form
A user visits your static website and fills out a form (contact, newsletter, etc.)

### 2. Turnstile Verification
Before submission, Cloudflare Turnstile verifies the user is human (invisible to most users)

### 3. Form Submission
JavaScript sends the form data + Turnstile token to your FormFlare worker

### 4. Server-Side Validation
FormFlare validates the Turnstile token, checks rate limits, and validates data

### 5. Data Storage
If valid, the submission is stored in either KV or D1 database

### 6. Confirmation
User receives confirmation, and you can retrieve submissions via API

## Architecture

```
┌─────────────────┐
│  Static Website │
│   (HTML + JS)   │
└────────┬────────┘
         │ POST /submit
         │ {formId, turnstileToken, data}
         ▼
┌─────────────────────────────────────┐
│      FormFlare Worker (Hono)        │
│  ┌───────────────────────────────┐  │
│  │  1. CORS Validation           │  │
│  │  2. Rate Limit Check          │  │
│  │  3. Turnstile Verification    │  │
│  │  4. Data Validation           │  │
│  │  5. Storage                   │  │
│  └───────────────────────────────┘  │
└──────────┬──────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  Storage     │
    │  (KV or D1)  │
    └──────────────┘
```

## Use Cases

### 1. Contact Forms
Collect customer inquiries without a backend server

### 2. Newsletter Signups
Build your email list with spam protection

### 3. Feedback Forms
Gather user feedback and ratings

### 4. Event Registration
Collect RSVPs and registration information

### 5. Support Tickets
Create a simple ticketing system

### 6. Job Applications
Collect job application data

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (lightweight web framework)
- **Language**: TypeScript
- **Storage**: Cloudflare KV or D1
- **Spam Protection**: Cloudflare Turnstile
- **Deployment**: Wrangler CLI

## API Endpoints

### Public Endpoints

- `GET /` - Health check
- `POST /submit` - Submit a form (requires Turnstile token)

### Protected Endpoints (require API key)

- `GET /submissions/:formId` - Get all submissions for a form
- `GET /submission/:id` - Get a specific submission

## Storage Options

### Cloudflare KV (Key-Value)
- **Best for**: Simple storage, small-medium volume
- **Pros**: Easy setup, very fast reads
- **Cons**: Limited query capabilities, eventual consistency

### Cloudflare D1 (SQLite)
- **Best for**: Complex queries, large volume
- **Pros**: Full SQL support, strong consistency
- **Cons**: Slightly more complex setup

## Security Features

1. **Turnstile Verification** - Prevents bot submissions
2. **Rate Limiting** - Prevents abuse (configurable per IP)
3. **CORS Configuration** - Restricts which domains can submit
4. **API Key Authentication** - Protects submission retrieval
5. **Input Validation** - Validates required fields
6. **IP Logging** - Tracks submission origin

## Configuration

All configuration is done through `wrangler.toml`:

```toml
# Storage binding (KV or D1)
[[kv_namespaces]]
binding = "FORM_SUBMISSIONS"
id = "your-kv-id"

# Environment variables
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com"
RATE_LIMIT_REQUESTS = "10"
RATE_LIMIT_WINDOW = "60"
```

Secrets are set via Wrangler CLI:
```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

## Getting Started

### Quick Start (5 minutes)

1. Install dependencies: `npm install`
2. Set up Turnstile at [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Create storage (KV or D1)
4. Configure `wrangler.toml`
5. Deploy: `npm run deploy`

See **SETUP.md** for detailed instructions.

## Examples

### Basic Contact Form
See `examples/example.html` for a simple, beautiful contact form

### Multiple Forms
See `examples/example-advanced.html` for handling multiple form types on one page

## Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Deploy to production
npm run deploy

# View live logs
npm run tail
```

## Cost Estimate

Cloudflare Workers free tier includes:
- 100,000 requests/day
- 10ms CPU time per request
- KV: 100,000 reads/day, 1,000 writes/day
- D1: 5M reads/day, 100k writes/day

For most small-medium websites, FormFlare runs **completely free**.

## Limitations

- Maximum request size: 100 MB
- Maximum execution time: 30 seconds (more than enough)
- KV eventual consistency: ~60 seconds globally
- D1 database size: 500 MB (free tier)

## Roadmap

Potential future features:
- [ ] Email notifications on submission
- [ ] Webhook support
- [ ] Admin dashboard
- [ ] File upload support
- [ ] Custom validation rules
- [ ] Submission analytics
- [ ] Export to CSV/JSON
- [ ] Integration with popular email services

## Support

- **Documentation**: See README.md, SETUP.md, and QUICK_REFERENCE.md
- **Examples**: Check example.html and example-advanced.html
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/

## License

MIT License - Feel free to use in personal and commercial projects

## Credits

Built with:
- [Hono](https://hono.dev/) - Lightweight web framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) - Spam protection
