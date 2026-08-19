/**
 * Email notification module
 * Supports multiple email providers: Resend, SendGrid, Mailgun, Mailtrap, Console
 */

import { generateEmailHTML, generateEmailTEXT, sanitizeSubmissionData } from './templates';

export interface EmailConfig {
  provider: 'console' | 'resend' | 'sendgrid' | 'mailgun' | 'mailtrap' | 'none';
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
  if (config.provider === 'none') {
    return { success: true }; // Skip if not configured
  }

  if (config.provider === 'console') {
    return sendViaConsole(config, submission);
  }

  if (!config.apiKey || !config.to) {
    return { success: true };
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
 * Send email via Console (Dev Output)
 */
function sendViaConsole(
  config: EmailConfig,
  submission: FormSubmissionData
): { success: boolean } {
  const sanitizedData = sanitizeSubmissionData(submission.data);

  console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│ 📧 [FormFlare Dev Email Logger]                                       │
├────────────────────────────────────────────────────────────────────────┤
│ Form ID:        ${submission.formId}
│ Submission ID:  ${submission.submissionId}
│ To:             ${config.to || 'dev@example.com'}
│ From:           ${config.from || 'noreply@localhost'}
│ Subject:        New Form Submission: ${submission.formId}
├────────────────────────────────────────────────────────────────────────┤
│ Form Data:
${JSON.stringify(sanitizedData, null, 2)}
└────────────────────────────────────────────────────────────────────────┘
`);
  return { success: true };
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
  const isSandbox = !!config.mailtrapInboxId;

  let url: string;
  let body: any;

  if (isSandbox) {
    url = `https://sandbox.api.mailtrap.io/api/send/${config.mailtrapInboxId}`;
    body = {
      from: { email: config.from },
      to: config.to.split(',').map(email => ({ email: email.trim() })),
      subject: `New Form Submission: ${submission.formId}`,
      html: generateEmailHTML(submission),
      text: generateEmailTEXT(submission),
    };
  } else {
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

  if (!response.ok) {
    return { success: false, error: `Mailtrap error: ${responseText}` };
  }

  return { success: true };
}
