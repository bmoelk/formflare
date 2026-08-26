/**
 * FormFlare Mustache Email Template Renderer
 * Imports .mustache files directly as the single source of truth.
 */

import Mustache from 'mustache';
import htmlTemplate from './email.html.mustache';
import textTemplate from './email.text.mustache';

export interface EmailTemplateData {
  formId: string;
  siteId?: string;
  submissionId: string;
  data: Record<string, any>;
  metadata: {
    ip: string;
    userAgent: string;
    timestamp: string;
    turnstileScore?: number;
  };
}

const SYSTEM_KEYS = new Set([
  'cf-turnstile-response',
  'cf_turnstile_response',
  'turnstileToken',
  'g-recaptcha-response',
  'formId',
  'siteId',
]);

/**
 * Filter out system/verification keys from submission data and format as template fields array
 */
export function sanitizeSubmissionData(data: Record<string, any>): Array<{ key: string; value: string }> {
  const fields: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(data)) {
    if (!SYSTEM_KEYS.has(key)) {
      fields.push({
        key,
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
      });
    }
  }
  return fields;
}

/**
 * Render HTML Email via Mustache
 */
export function generateEmailHTML(submission: EmailTemplateData): string {
  const fields = sanitizeSubmissionData(submission.data);
  const context = {
    formId: submission.formId,
    siteId: submission.siteId || null,
    submissionId: submission.submissionId,
    timestamp: new Date(submission.metadata.timestamp).toUTCString(),
    ip: submission.metadata.ip,
    turnstileScore: submission.metadata.turnstileScore !== undefined ? submission.metadata.turnstileScore.toFixed(2) : null,
    fields,
  };
  return Mustache.render(htmlTemplate, context);
}

/**
 * Render Plaintext Email via Mustache
 */
export function generateEmailTEXT(submission: EmailTemplateData): string {
  const fields = sanitizeSubmissionData(submission.data);
  const context = {
    formId: submission.formId,
    siteId: submission.siteId || null,
    submissionId: submission.submissionId,
    timestamp: new Date(submission.metadata.timestamp).toUTCString(),
    ip: submission.metadata.ip,
    turnstileScore: submission.metadata.turnstileScore !== undefined ? submission.metadata.turnstileScore.toFixed(2) : null,
    fields,
  };
  return Mustache.render(textTemplate, context);
}
