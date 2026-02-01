import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyTurnstile } from './turnstile';
import { storeSubmission, getSubmissions, getSubmission } from './storage';
import { checkRateLimit } from './ratelimit';
import { getFormHandlerJS } from './static';
import { sendEmailNotification, type EmailConfig } from './email';

type Bindings = {
    FORM_SUBMISSIONS?: KVNamespace;
    DB?: D1Database;
    TURNSTILE_SECRET_KEY: string;
    ALLOWED_ORIGINS: string;
    RATE_LIMIT_ENABLED: string;
    RATE_LIMIT_REQUESTS: string;
    RATE_LIMIT_WINDOW: string;
    EMAIL_PROVIDER: string;
    EMAIL_API_KEY: string;
    EMAIL_FROM: string;
    EMAIL_TO: string;
    MAILGUN_DOMAIN?: string;
    MAILTRAP_INBOX_ID?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('/*', async (c, next) => {
    const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',');
    const origin = c.req.header('origin') || '*';

    const corsMiddleware = cors({
        origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    });

    return corsMiddleware(c, next);
});

// Health check endpoint
app.get('/', (c) => {
    return c.json({
        service: 'FormFlare',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// Serve form-handler.js client library
app.get('/form-handler.js', (c) => {
    const jsContent = getFormHandlerJS();

    return c.text(jsContent, 200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
    });
});

// Submit form endpoint
app.post('/submit', async (c) => {
    try {
        const clientIP = c.req.header('cf-connecting-ip') || 'unknown';

        // Rate limiting (if enabled)
        const rateLimitEnabled = c.env.RATE_LIMIT_ENABLED?.toLowerCase() === 'true';
        if (rateLimitEnabled) {
            const rateLimitResult = await checkRateLimit(
                c.env.FORM_SUBMISSIONS,
                clientIP,
                parseInt(c.env.RATE_LIMIT_REQUESTS || '10'),
                parseInt(c.env.RATE_LIMIT_WINDOW || '60')
            );

            if (!rateLimitResult.allowed) {
                return c.json(
                    {
                        success: false,
                        error: 'Rate limit exceeded',
                        retryAfter: rateLimitResult.retryAfter,
                    },
                    429
                );
            }
        }

        const body = await c.req.json();
        const { turnstileToken, formId, data } = body;

        // Validate required fields
        if (!turnstileToken) {
            return c.json(
                { success: false, error: 'Turnstile token is required' },
                400
            );
        }

        if (!formId) {
            return c.json(
                { success: false, error: 'Form ID is required' },
                400
            );
        }

        if (!data || typeof data !== 'object') {
            return c.json(
                { success: false, error: 'Form data is required' },
                400
            );
        }

        // Verify Turnstile token
        const turnstileResult = await verifyTurnstile(
            turnstileToken,
            c.env.TURNSTILE_SECRET_KEY,
            clientIP
        );

        if (!turnstileResult.success) {
            return c.json(
                {
                    success: false,
                    error: 'Turnstile verification failed',
                    details: turnstileResult.errors,
                },
                403
            );
        }

        // Prepare submission data
        const submissionData = {
            formId,
            data,
            metadata: {
                ip: clientIP,
                userAgent: c.req.header('user-agent') || 'unknown',
                timestamp: new Date().toISOString(),
                turnstileScore: turnstileResult.score,
            },
        };

        // Store submission
        const submissionId = await storeSubmission(
            c.env.FORM_SUBMISSIONS,
            c.env.DB,
            submissionData
        );

        // Send email notification (if configured)
        const emailConfig: EmailConfig = {
            provider: (c.env.EMAIL_PROVIDER?.toLowerCase() as any) || 'none',
            apiKey: c.env.EMAIL_API_KEY || '',
            from: c.env.EMAIL_FROM || '',
            to: c.env.EMAIL_TO || '',
            mailgunDomain: c.env.MAILGUN_DOMAIN,
            mailtrapInboxId: c.env.MAILTRAP_INBOX_ID,
        };

        // Send email asynchronously (don't wait for it)
        if (emailConfig.provider !== 'none') {
            sendEmailNotification(emailConfig, {
                ...submissionData,
                submissionId,
            }).catch((error) => {
                console.error('Email notification failed:', error);
                // Don't fail the request if email fails
            });
        }

        return c.json({
            success: true,
            submissionId,
            message: 'Form submitted successfully',
        });
    } catch (error) {
        console.error('Error processing form submission:', error);
        return c.json(
            {
                success: false,
                error: 'Internal server error',
            },
            500
        );
    }
});

// Get all submissions for a form (requires authentication)
app.get('/submissions/:formId', async (c) => {
    try {
        // TODO: Add authentication middleware
        const authHeader = c.req.header('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }

        const formId = c.req.param('formId');
        const limit = parseInt(c.req.query('limit') || '100');
        const offset = parseInt(c.req.query('offset') || '0');

        const submissions = await getSubmissions(
            c.env.FORM_SUBMISSIONS,
            c.env.DB,
            formId,
            limit,
            offset
        );

        return c.json({
            success: true,
            formId,
            submissions,
            pagination: {
                limit,
                offset,
            },
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return c.json(
            {
                success: false,
                error: 'Internal server error',
            },
            500
        );
    }
});

// Get a specific submission (requires authentication)
app.get('/submission/:id', async (c) => {
    try {
        // TODO: Add authentication middleware
        const authHeader = c.req.header('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }

        const submissionId = c.req.param('id');
        const submission = await getSubmission(
            c.env.FORM_SUBMISSIONS,
            c.env.DB,
            submissionId
        );

        if (!submission) {
            return c.json(
                { success: false, error: 'Submission not found' },
                404
            );
        }

        return c.json({
            success: true,
            submission,
        });
    } catch (error) {
        console.error('Error fetching submission:', error);
        return c.json(
            {
                success: false,
                error: 'Internal server error',
            },
            500
        );
    }
});

export default app;
