# FormFlare Client Library

## Overview

The FormFlare Client Library is a JavaScript library that simplifies integration with the FormFlare worker. It's served directly from your worker at `/form-handler.js` and provides automatic form handling, Turnstile widget injection, and error management.

## Features

- ✅ **Auto-initialization** - Automatically handles forms with `data-formflare` attribute
- ✅ **Turnstile Auto-injection** - Automatically adds Turnstile widgets to forms
- ✅ **Error Handling** - Built-in error messages and user feedback
- ✅ **Custom Events** - Emits `formflare:success` and `formflare:error` events
- ✅ **Zero Dependencies** - Pure vanilla JavaScript, no frameworks required
- ✅ **Lightweight** - Small footprint, loads quickly
- ✅ **CORS Enabled** - Can be loaded from any domain

## Installation

Simply include the script from your deployed worker:

```html
<script src="https://your-worker.workers.dev/form-handler.js"></script>
```

## Basic Usage

### 1. Add the data-formflare attribute to your form

```html
<form id="contact-form" data-formflare="contact-form">
    <input type="text" name="name" required>
    <input type="email" name="email" required>
    <textarea name="message" required></textarea>
    <button type="submit">Submit</button>
</form>
```

### 2. Load and initialize the library

```html
<script src="https://your-worker.workers.dev/form-handler.js"></script>
<script>
    FormFlare.init({
        workerUrl: 'https://your-worker.workers.dev',
        turnstileSiteKey: 'YOUR_TURNSTILE_SITE_KEY',
        autoInit: true
    });
</script>
```

That's it! The library will:
- Automatically detect forms with `data-formflare` attribute
- Inject Turnstile widgets before the submit button
- Handle form submissions
- Show success/error messages
- Reset the form on success

## Configuration Options

```javascript
FormFlare.init({
    workerUrl: '',           // Required: Your FormFlare worker URL
    turnstileSiteKey: '',    // Required: Your Turnstile site key
    autoInit: true,          // Auto-initialize forms with data-formflare
    debug: false             // Enable debug logging
});
```

## Manual Form Attachment

If you don't want to use auto-initialization, you can manually attach forms:

```javascript
FormFlare.init({
    workerUrl: 'https://your-worker.workers.dev',
    turnstileSiteKey: 'YOUR_SITE_KEY',
    autoInit: false  // Disable auto-init
});

// Manually attach a form
FormFlare.attachForm('#my-form', 'my-form-id');
// or
FormFlare.attachForm(document.getElementById('my-form'), 'my-form-id');
```

## Custom Events

The library emits custom events that you can listen to:

### formflare:success

Fired when a form is successfully submitted.

```javascript
document.getElementById('contact-form').addEventListener('formflare:success', (e) => {
    console.log('Submission ID:', e.detail.submissionId);
    console.log('Form ID:', e.detail.formId);
    
    // Custom success handling
    // e.g., redirect to thank you page
    window.location.href = '/thank-you';
});
```

### formflare:error

Fired when a form submission fails.

```javascript
document.getElementById('contact-form').addEventListener('formflare:error', (e) => {
    console.error('Error:', e.detail.error);
    console.log('Form ID:', e.detail.formId);
    
    // Custom error handling
    // e.g., show a custom error modal
});
```

## API Reference

### FormFlare.init(options)

Initialize the FormFlare library.

**Parameters:**
- `options` (Object)
  - `workerUrl` (string, required) - Your FormFlare worker URL
  - `turnstileSiteKey` (string, required) - Your Turnstile site key
  - `autoInit` (boolean, default: true) - Auto-initialize forms
  - `debug` (boolean, default: false) - Enable debug logging

### FormFlare.attachForm(form, formId)

Manually attach FormFlare to a form.

**Parameters:**
- `form` (HTMLFormElement | string) - Form element or CSS selector
- `formId` (string) - Unique identifier for the form

### FormFlare.autoInitForms()

Manually trigger auto-initialization of forms with `data-formflare` attribute.

### FormFlare.loadTurnstile()

Manually load the Turnstile script (called automatically if needed).

## Styling Messages

The library automatically shows success/error messages. You can customize their appearance with CSS:

```css
.formflare-message {
    /* Base message styles */
}

.formflare-message-success {
    /* Success message styles */
}

.formflare-message-error {
    /* Error message styles */
}
```

Or override the default styles in JavaScript:

```javascript
// After form submission, you can access and modify the message element
document.getElementById('contact-form').addEventListener('formflare:success', (e) => {
    const message = document.querySelector('.formflare-message-success');
    if (message) {
        message.style.background = 'green';
        message.style.color = 'white';
    }
});
```

## Advanced Usage

### Multiple Forms on One Page

```html
<form data-formflare="contact-form">
    <!-- Contact form fields -->
</form>

<form data-formflare="newsletter-form">
    <!-- Newsletter form fields -->
</form>

<script src="https://your-worker.workers.dev/form-handler.js"></script>
<script>
    FormFlare.init({
        workerUrl: 'https://your-worker.workers.dev',
        turnstileSiteKey: 'YOUR_SITE_KEY'
    });
    
    // Different handlers for different forms
    document.querySelector('[data-formflare="contact-form"]')
        .addEventListener('formflare:success', (e) => {
            console.log('Contact form submitted!');
        });
    
    document.querySelector('[data-formflare="newsletter-form"]')
        .addEventListener('formflare:success', (e) => {
            console.log('Newsletter signup!');
        });
</script>
```

### Conditional Initialization

```javascript
// Only initialize if Turnstile is available
if (typeof turnstile !== 'undefined') {
    FormFlare.init({
        workerUrl: 'https://your-worker.workers.dev',
        turnstileSiteKey: 'YOUR_SITE_KEY'
    });
} else {
    console.warn('Turnstile not loaded');
}
```

### Custom Turnstile Widget Placement

By default, the library adds the Turnstile widget before the submit button. If you want to control the placement, add the widget manually:

```html
<form data-formflare="contact-form">
    <input type="text" name="name" required>
    <input type="email" name="email" required>
    
    <!-- Manually placed Turnstile widget -->
    <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
    
    <button type="submit">Submit</button>
</form>
```

The library will detect the existing widget and won't add another one.

## Browser Support

The library uses modern JavaScript features and supports:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

For older browsers, you may need to include polyfills for:
- `fetch`
- `Promise`
- `FormData`
- `CustomEvent`

## Troubleshooting

### "FormFlare is not defined"

Make sure the script is loaded before you try to use it:

```html
<!-- Load the library first -->
<script src="https://your-worker.workers.dev/form-handler.js"></script>

<!-- Then use it -->
<script>
    FormFlare.init({ /* ... */ });
</script>
```

### Turnstile widget not appearing

1. Check that your site key is correct
2. Make sure the domain matches your Turnstile configuration
3. Check browser console for errors
4. Verify the Turnstile script is loading

### Form not submitting

1. Enable debug mode: `FormFlare.init({ debug: true, /* ... */ })`
2. Check browser console for errors
3. Verify the `data-formflare` attribute is set
4. Make sure the worker URL is correct

### CORS errors

The `/form-handler.js` endpoint has CORS enabled by default. If you're still seeing CORS errors:

1. Check that you're using the correct worker URL
2. Verify your worker is deployed and accessible
3. Check browser console for specific CORS error messages

## Examples

See the following example files:
- `example-with-library.html` - Basic usage with single form
- `example-advanced.html` - Multiple forms with statistics

## License

MIT
