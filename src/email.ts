/**
 * Email notification module
 * Supports multiple email providers: Resend, SendGrid, Mailgun, Mailtrap
 */

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun' | 'mailtrap' | 'none';
  apiKey: string;
  from: string;
  to: string;
  mailgunDomain?: string; // Required for Mailgun
  mailtrapInboxId?: string; // Required for Mailtrap (testing mode)
}

export interface FormSubmissionData {
  formId: string;
  submissionId: string;
  data: Record<string, any>;
  metadata: {
    ip: string;
    userAgent: string;
    timestamp: string;
    turnstileScore?: number;
  };
}

/**
 * Send email notification for form submission
 */
export async function sendEmailNotification(
  config: EmailConfig,
  submission: FormSubmissionData
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === 'none' || !config.apiKey || !config.to) {
    return { success: true }; // Skip if not configured
  }

  try {
    switch (config.provider) {
      case 'resend':
        return await sendViaResend(config, submission);
      case 'sendgrid':
        return await sendViaSendGrid(config, submission);
      case 'mailgun':
        return await sendViaMailgun(config, submission);
      case 'mailtrap':
        return await sendViaMailtrap(config, submission);
      default:
        return { success: false, error: 'Unknown email provider' };
    }
  } catch (error) {
    console.error('Email notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(
  config: EmailConfig,
  submission: FormSubmissionData
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to.split(',').map(email => email.trim()),
      subject: `New Form Submission: ${submission.formId}`,
      html: generateEmailHTML(submission),
      text: generateEmailTEXT(submission),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Resend error: ${error}` };
  }

  return { success: true };
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(
  config: EmailConfig,
  submission: FormSubmissionData
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: config.to.split(',').map(email => ({ email: email.trim() })),
        },
      ],
      from: { email: config.from },
      subject: `New Form Submission: ${submission.formId}`,
      content: [
        {
          type: 'text/plain',
          value: generateEmailTEXT(submission),
        },
        {
          type: 'text/html',
          value: generateEmailHTML(submission),
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `SendGrid error: ${error}` };
  }

  return { success: true };
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(
  config: EmailConfig,
  submission: FormSubmissionData
): Promise<{ success: boolean; error?: string }> {
  if (!config.mailgunDomain) {
    return { success: false, error: 'Mailgun domain is required' };
  }

  const formData = new FormData();
  formData.append('from', config.from);
  formData.append('to', config.to);
  formData.append('subject', `New Form Submission: ${submission.formId}`);
  formData.append('html', generateEmailHTML(submission));
  formData.append('text', generateEmailTEXT(submission));

  const response = await fetch(
    `https://api.mailgun.net/v3/${config.mailgunDomain}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${config.apiKey}`)}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Mailgun error: ${error}` };
  }

  return { success: true };
}

/**
 * Send email via Mailtrap
 * Supports both testing (sandbox) and production modes
 */
async function sendViaMailtrap(
  config: EmailConfig,
  submission: FormSubmissionData
): Promise<{ success: boolean; error?: string }> {
  // Determine if using testing (sandbox) or production mode
  const isSandbox = !!config.mailtrapInboxId;

  let url: string;
  let body: any;

  if (isSandbox) {
    // Testing mode - send to inbox
    url = `https://sandbox.api.mailtrap.io/api/send/${config.mailtrapInboxId}`;
    body = {
      from: { email: config.from },
      to: config.to.split(',').map(email => ({ email: email.trim() })),
      subject: `New Form Submission: ${submission.formId}`,
      html: generateEmailHTML(submission),
      text: generateEmailTEXT(submission),
    };
  } else {
    // Production mode - send via Mailtrap Send
    url = 'https://send.api.mailtrap.io/api/send';
    body = {
      from: { email: config.from },
      to: config.to.split(',').map(email => ({ email: email.trim() })),
      subject: `New Form Submission: ${submission.formId}`,
      html: generateEmailHTML(submission),
      text: generateEmailTEXT(submission),
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  console.log(responseText);

  if (!response.ok) {
    // const error = await response.text();
    return { success: false, error: `Mailtrap error: ${responseText}` };
  }

  return { success: true };
}

/**
 * Generate text email content
 */
function generateEmailTEXT(submission: FormSubmissionData): string {
  const formDataRows = Object.entries(submission.data)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return `
New Form Submission
===================

Form ID: ${submission.formId}
Submission ID: ${submission.submissionId}
Timestamp: ${new Date(submission.metadata.timestamp).toLocaleString()}
IP Address: ${submission.metadata.ip}
${submission.metadata.turnstileScore ? `Spam Score: ${submission.metadata.turnstileScore.toFixed(2)}` : ''}

Form Data
---------
${formDataRows}

------------------------------------------------
Sent by FormFlare • Powered by Cloudflare Workers
  `.trim();
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(submission: FormSubmissionData): string {
  const formDataRows = Object.entries(submission.data)
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333;">
            ${escapeHtml(key)}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #666;">
            ${escapeHtml(String(value))}
          </td>
        </tr>
      `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🎉 New Form Submission
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Form ID: ${escapeHtml(submission.formId)}
              </p>
            </td>
          </tr>
          
          <!-- Submission Info -->
          <tr>
            <td style="padding: 20px 30px;">
              <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
                <strong>Submission ID:</strong> ${escapeHtml(submission.submissionId)}<br>
                <strong>Timestamp:</strong> ${new Date(submission.metadata.timestamp).toLocaleString()}<br>
                <strong>IP Address:</strong> ${escapeHtml(submission.metadata.ip)}<br>
                ${submission.metadata.turnstileScore ? `<strong>Spam Score:</strong> ${submission.metadata.turnstileScore.toFixed(2)}<br>` : ''}
              </p>
            </td>
          </tr>
          
          <!-- Form Data -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="margin: 0 0 16px 0; color: #333; font-size: 18px; font-weight: 600;">
                Form Data
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 4px;">
                ${formDataRows}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                Sent by FormFlare • Powered by Cloudflare Workers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
