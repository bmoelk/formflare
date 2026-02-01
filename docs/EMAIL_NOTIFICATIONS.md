# Email Notifications

FormFlare supports automatic email notifications when forms are submitted. This guide explains how to configure email notifications using different providers.

## Supported Email Providers

- **Resend** - Modern email API (recommended)
- **SendGrid** - Popular email service
- **Mailgun** - Reliable email delivery
- **None** - Disable email notifications (default)

## Quick Setup

### 1. Choose Your Email Provider

FormFlare supports three popular email providers. Choose the one that best fits your needs:

| Provider | Pros | Cons | Free Tier |
|----------|------|------|-----------|
| **Resend** | Modern API, great DX, simple setup | Newer service | 3,000 emails/month |
| **SendGrid** | Well-established, reliable | More complex API | 100 emails/day |
| **Mailgun** | Very reliable, good deliverability | Requires domain verification | 5,000 emails/month (first 3 months) |

### 2. Get API Credentials

#### Resend

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys
3. Create a new API key
4. Copy the API key

#### SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Go to Settings → API Keys
3. Create API Key with "Mail Send" permissions
4. Copy the API key

#### Mailgun

1. Sign up at [mailgun.com](https://mailgun.com)
2. Add and verify your domain
3. Go to Settings → API Keys
4. Copy your Private API key
5. Note your domain name

### 3. Configure FormFlare

Update your `wrangler.toml`:

```toml
[vars]
EMAIL_PROVIDER = "resend"  # or "sendgrid", "mailgun", "none"
EMAIL_FROM = "FormFlare <noreply@yourdomain.com>"
EMAIL_TO = "admin@yourdomain.com"
# MAILGUN_DOMAIN = "yourdomain.com"  # Only for Mailgun
```

For multiple recipients, use comma-separated emails:
```toml
EMAIL_TO = "admin@yourdomain.com,support@yourdomain.com"
```

### 4. Set API Key Secret

```bash
npx wrangler secret put EMAIL_API_KEY
# Paste your API key when prompted
```

### 5. Deploy

```bash
npm run deploy
```

## Configuration Options

### Environment Variables

Set in `wrangler.toml`:

```toml
[vars]
# Email provider: resend, sendgrid, mailgun, or none
EMAIL_PROVIDER = "resend"

# From address (must be verified with your provider)
EMAIL_FROM = "FormFlare <noreply@yourdomain.com>"

# To address(es) - comma-separated for multiple recipients
EMAIL_TO = "admin@yourdomain.com,team@yourdomain.com"

# Mailgun only: your verified domain
MAILGUN_DOMAIN = "mg.yourdomain.com"
```

### Secrets

Set via Wrangler CLI:

```bash
# Email API key (required if EMAIL_PROVIDER is not "none")
npx wrangler secret put EMAIL_API_KEY
```

## Email Template

FormFlare sends a beautiful HTML email with:

- **Header** - Form name and submission info
- **Metadata** - Timestamp, IP address, spam score
- **Form Data** - All submitted fields in a table
- **Footer** - Branding

### Example Email

```
🎉 New Form Submission
Form ID: contact-form

Submission ID: abc123xyz
Timestamp: 2024-01-31 20:00:00
IP Address: 192.168.1.1
Spam Score: 0.95

Form Data:
┌──────────┬────────────────────┐
│ Name     │ John Doe           │
│ Email    │ john@example.com   │
│ Message  │ Hello, I need help │
└──────────┴────────────────────┘
```

## Provider-Specific Setup

### Resend Setup

1. **Sign up**: [resend.com](https://resend.com)
2. **Verify domain** (optional but recommended):
   - Go to Domains
   - Add your domain
   - Add DNS records
3. **Create API key**:
   - Go to API Keys
   - Create new key
   - Copy the key
4. **Configure FormFlare**:
   ```toml
   EMAIL_PROVIDER = "resend"
   EMAIL_FROM = "noreply@yourdomain.com"
   EMAIL_TO = "admin@yourdomain.com"
   ```
5. **Set secret**:
   ```bash
   npx wrangler secret put EMAIL_API_KEY
   ```

### SendGrid Setup

1. **Sign up**: [sendgrid.com](https://sendgrid.com)
2. **Verify sender** (required):
   - Go to Settings → Sender Authentication
   - Verify a single sender OR authenticate your domain
3. **Create API key**:
   - Go to Settings → API Keys
   - Create API Key
   - Select "Mail Send" permission
   - Copy the key
4. **Configure FormFlare**:
   ```toml
   EMAIL_PROVIDER = "sendgrid"
   EMAIL_FROM = "noreply@yourdomain.com"
   EMAIL_TO = "admin@yourdomain.com"
   ```
5. **Set secret**:
   ```bash
   npx wrangler secret put EMAIL_API_KEY
   ```

### Mailgun Setup

1. **Sign up**: [mailgun.com](https://mailgun.com)
2. **Add domain**:
   - Go to Sending → Domains
   - Add new domain
   - Add DNS records (SPF, DKIM, MX)
   - Wait for verification
3. **Get API key**:
   - Go to Settings → API Keys
   - Copy your Private API key
4. **Configure FormFlare**:
   ```toml
   EMAIL_PROVIDER = "mailgun"
   EMAIL_FROM = "noreply@yourdomain.com"
   EMAIL_TO = "admin@yourdomain.com"
   MAILGUN_DOMAIN = "mg.yourdomain.com"
   ```
5. **Set secret**:
   ```bash
   npx wrangler secret put EMAIL_API_KEY
   ```

## Testing

### Test Email Notifications

1. **Deploy your worker**:
   ```bash
   npm run deploy
   ```

2. **Submit a test form**:
   - Use `example.html` or `example-with-library.html`
   - Fill out and submit the form

3. **Check your inbox**:
   - You should receive an email within seconds
   - Check spam folder if not in inbox

### Troubleshooting

**No email received:**
1. Check worker logs: `npm run tail`
2. Verify EMAIL_PROVIDER is set correctly
3. Verify EMAIL_API_KEY secret is set
4. Check EMAIL_FROM is verified with your provider
5. Check spam folder

**Email in spam:**
1. Verify your domain with the email provider
2. Set up SPF, DKIM, and DMARC records
3. Use a professional "from" address

**API errors:**
1. Check API key is correct
2. Verify sender address is authorized
3. Check provider dashboard for errors

## Advanced Configuration

### Conditional Email Notifications

You can modify the code to send emails only for specific forms:

```typescript
// In src/index.ts, modify the email notification section:
if (emailConfig.provider !== 'none' && formId === 'contact-form') {
    // Only send emails for contact form
    sendEmailNotification(emailConfig, {
        ...submissionData,
        submissionId,
    }).catch((error) => {
        console.error('Email notification failed:', error);
    });
}
```

### Custom Email Templates

To customize the email template, edit `src/email.ts`:

```typescript
function generateEmailHTML(submission: FormSubmissionData): string {
  // Customize the HTML template here
  return `
    <!DOCTYPE html>
    <html>
    <!-- Your custom template -->
    </html>
  `;
}
```

### Multiple Recipients Per Form

You can configure different recipients for different forms:

```typescript
// In src/index.ts
const emailTo = formId === 'contact-form' 
  ? 'sales@example.com'
  : formId === 'support-form'
  ? 'support@example.com'
  : c.env.EMAIL_TO;

const emailConfig: EmailConfig = {
  // ... other config
  to: emailTo,
};
```

## Email Delivery Best Practices

1. **Verify your domain** - Improves deliverability
2. **Use professional from address** - Avoid generic addresses
3. **Set up SPF/DKIM/DMARC** - Prevents spoofing
4. **Monitor bounce rates** - Keep your sender reputation high
5. **Test regularly** - Ensure emails are being delivered

## Cost Considerations

All providers offer generous free tiers:

- **Resend**: 3,000 emails/month free
- **SendGrid**: 100 emails/day free (3,000/month)
- **Mailgun**: 5,000 emails/month free (first 3 months)

For most small-medium websites, the free tier is sufficient.

## Disabling Email Notifications

To disable email notifications:

```toml
[vars]
EMAIL_PROVIDER = "none"
```

Or simply don't set the `EMAIL_API_KEY` secret.

## Security Notes

1. **Never commit API keys** - Always use secrets
2. **Validate sender addresses** - Prevent email spoofing
3. **Rate limit emails** - Prevent abuse
4. **Sanitize form data** - Prevent XSS in emails

## Support

For provider-specific issues:
- **Resend**: [docs.resend.com](https://resend.com/docs)
- **SendGrid**: [docs.sendgrid.com](https://docs.sendgrid.com)
- **Mailgun**: [documentation.mailgun.com](https://documentation.mailgun.com)
