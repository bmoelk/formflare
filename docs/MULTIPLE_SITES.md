# Supporting Multiple Websites

FormFlare is designed to be flexible. You can use it to support multiple websites in two ways:

1. **Shared Instance**: One worker serving multiple websites (Multi-tenancy).
2. **Multiple Instances**: Separate worker deployments for each website.

## Option 1: Shared Instance (Recommended for most cases)

You can run a single FormFlare worker that accepts submissions from all your different websites.

### Configuration

1. **Update Allowed Origins**
   In `wrangler.toml`, add all your domains to the allowed origins list:
   
   ```toml
   [vars]
   # Allow requests from multiple domains
   ALLOWED_ORIGINS = "https://site-a.com,https://site-b.com,https://www.mysite.org"
   ```

2. **Use Unique Form IDs**
   When integrating the form on your websites, simply use distinct IDs to identify them:

   **On Site A:**
   ```html
   <form data-formflare="site-a-contact">
   ```
   
   **On Site B:**
   ```html
   <form data-formflare="site-b-newsletter">
   ```

### 3. Turnstile Configuration

For a shared instance, you have two options for Turnstile:

#### A. Single Widget (Simplest)
1. Go to Cloudflare Dashboard > Turnstile
2. Create **one** widget (Site Key)
3. In the "Hostname Management" settings, add **all** your domains
4. Use this single Site Key on all your websites
5. Use the single Secret Key in your worker

#### B. Multiple Widgets (Advanced)
If you need separate Turnstile analytics for each site:
1. Create separate widgets for each site
2. This requires updating the worker code to support multiple secret keys (mapped by hostname or form ID)
3. **Recommendation:** If you need this level of separation, use **Option 2 (Multiple Instances)** instead.

### Pros & Cons
*   ✅ **Pros**: Single deployment to manage, free tier covers a lot of usage (100k req/day), centralized data.
*   ❌ **Cons**: Shared configuration (same email provider for all), shared logs, requires unified Turnstile widget.

---

## Option 2: Multiple Instances (For complete isolation)

If you need separate email configurations, separate databases, or just want complete isolation between clients/projects, you can deploy multiple instances.

### Using Environments (Best for managing multiple deploys)

You can define multiple environments in a single `wrangler.toml` file.

1. **Modify `wrangler.toml`**:

   ```toml
   name = "formflare-generic"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   # Default (Shared) Configuration
   [vars]
   ALLOWED_ORIGINS = "*"
   EMAIL_PROVIDER = "none"

   # --- Website A Configuration ---
   [env.site-a]
   name = "formflare-site-a"
   kv_namespaces = [
     { binding = "FORM_SUBMISSIONS", id = "KV_ID_FOR_SITE_A" }
   ]
   [env.site-a.vars]
   ALLOWED_ORIGINS = "https://site-a.com"
   EMAIL_PROVIDER = "resend"
   EMAIL_FROM = "contact@site-a.com"

   # --- Website B Configuration ---
   [env.site-b]
   name = "formflare-site-b"
   kv_namespaces = [
     { binding = "FORM_SUBMISSIONS", id = "KV_ID_FOR_SITE_B" }
   ]
   [env.site-b.vars]
   ALLOWED_ORIGINS = "https://site-b.com"
   EMAIL_PROVIDER = "sendgrid"
   EMAIL_FROM = "sales@site-b.com"
   ```

2. **Deploying Specific Sites**:

   To deploy Site A:
   ```bash
   npx wrangler deploy --env site-a
   ```

   To deploy Site B:
   ```bash
   npx wrangler deploy --env site-b
   ```

3. **Managing Secrets Per Environment**:
   You'll need to set secrets for each environment separately:

   ```bash
   # Secrets for Site A
   npx wrangler secret put TURNSTILE_SECRET_KEY --env site-a
   npx wrangler secret put EMAIL_API_KEY --env site-a
   
   # Secrets for Site B
   npx wrangler secret put TURNSTILE_SECRET_KEY --env site-b
   npx wrangler secret put EMAIL_API_KEY --env site-b
   ```

### Pros & Cons
*   ✅ **Pros**: Complete isolation, different email providers per site, separate logs/analytics.
*   ❌ **Cons**: More complex to manage and deploy updates.

---

## Which one should I choose?

| Use Case | Recommended Approach |
|----------|----------------------|
| Personal portfolio & blog | **Option 1 (Shared)** |
| Multiple small client sites | **Option 1 (Shared)** |
| Sites requiring different email settings | **Option 2 (Environments)** |
| High-traffic production apps | **Option 2 (Environments)** |
| Strict data isolation requirements | **Option 2 (Environments)** |
