# FormFlare Client Integration Guide 💻

This guide covers integrating FormFlare with your frontend websites, whether you prefer vanilla HTML/JavaScript or the built-in FormFlare client library.

---

## 1. Quick Integration: Vanilla HTML & Fetch

The simplest way to submit a form to FormFlare without external dependencies:

```html
<!-- 1. Include Cloudflare Turnstile API -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<!-- 2. Form with Turnstile Widget -->
<form
  id="contact-form"
  action="https://your-worker.workers.dev/submit"
  method="POST"
  data-formflare="contact"
  data-formflare-site="mysite"
>
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message" required></textarea>

  <!-- Turnstile Anti-Spam Widget -->
  <div class="cf-turnstile" data-sitekey="YOUR_TURNSTILE_SITE_KEY"></div>

  <button type="submit">Send Message</button>
</form>

<!-- 3. Lightweight AJAX Submission Handler -->
<script>
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = turnstile.getResponse();

    if (!token) {
      alert('Please complete the anti-spam verification.');
      return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    delete data['cf-turnstile-response']; // Keep payload clean

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.dataset.formflare || 'contact',
          siteId: form.dataset.formflareSite,
          turnstileToken: token,
          data,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('Message sent successfully!');
        form.reset();
        turnstile.reset();
      } else {
        alert('Error: ' + (result.error || 'Failed to submit'));
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  });
</script>
```

---

## 2. Using the FormFlare Client Library (`/form-handler.js`)

FormFlare includes a lightweight (under 2KB) drop-in client library served directly from your Worker.

### Automatic Initialization via HTML Data Attributes

Add `data-formflare` to any form, and the library automatically handles Turnstile token extraction, validation, and submission states:

```html
<!-- Include Turnstile and FormFlare scripts -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="https://your-worker.workers.dev/form-handler.js"></script>

<form
  action="https://your-worker.workers.dev/submit"
  method="POST"
  data-formflare="contact-form"
  data-formflare-site="mysite"
  data-success-message="Thank you! Your message has been sent."
>
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>

  <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
  <button type="submit">Submit</button>
</form>
```

### Supported Form Data Attributes

| Attribute | Description | Example |
| :--- | :--- | :--- |
| `data-formflare` | Unique form identifier | `data-formflare="contact"` |
| `data-formflare-site` | Optional site ID for multi-tenant Turnstile/webhook routing | `data-formflare-site="mysite"` |
| `data-success-message` | Custom message displayed on submission success | `data-success-message="Received!"` |
| `data-redirect` | URL to redirect user to on success | `data-redirect="/thank-you"` |

---

## 3. Multi-Tenant Architecture & Site Routing

FormFlare supports managing multiple distinct websites from a single worker deployment without cross-talk:

1. **Tag Forms with `data-formflare-site`**:
   ```html
   <!-- Site A Form -->
   <form data-formflare="contact" data-formflare-site="mysite_a">...</form>

   <!-- Site B Form -->
   <form data-formflare="contact" data-formflare-site="mysite_b">...</form>
   ```

2. **Backend Resolution**:
   * **Turnstile Secret**: Looks for `TURNSTILE_SECRET_KEY_${SITE_ID}` (e.g. `TURNSTILE_SECRET_KEY_MYSITE_A`), falling back to `TURNSTILE_SECRET_KEY`.
   * **Webhook URL**: Looks for `WEBHOOK_URL_${SITE_ID}` (e.g. `WEBHOOK_URL_MYSITE_A`), falling back to `WEBHOOK_URL`.

3. **Separation Rule**:
   * System routing metadata (`formId`, `siteId`) is strictly specified via `<form>` dataset attributes or JS client config.
   * Standard `<input type="hidden">` tags are reserved for user/business form payload data.
