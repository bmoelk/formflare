import { nanoid } from 'nanoid';

export interface FormSubmission {
    formId: string;
    data: Record<string, any>;
    metadata: {
        ip: string;
        userAgent: string;
        timestamp: string;
        turnstileScore?: number;
    };
}

export interface StoredSubmission extends FormSubmission {
    id: string;
}

/**
 * Store a form submission
 * Supports both KV and D1 storage
 */
export async function storeSubmission(
    submission: FormSubmission,
    kv?: KVNamespace,
    db?: D1Database,
): Promise<string> {
    const submissionId = nanoid();
    const storedSubmission: StoredSubmission = {
        id: submissionId,
        ...submission,
    };

    // Prefer D1 if available, fallback to KV
    if (db) {
        await db
            .prepare(
                `INSERT INTO submissions (id, form_id, data, metadata, created_at)
         VALUES (?, ?, ?, ?, ?)`
            )
            .bind(
                submissionId,
                submission.formId,
                JSON.stringify(submission.data),
                JSON.stringify(submission.metadata),
                submission.metadata.timestamp
            )
            .run();
    } else if (kv) {
        // Store in KV with form-specific prefix for easier querying
        const key = `submission:${submission.formId}:${submissionId}`;
        await kv.put(key, JSON.stringify(storedSubmission), {
            metadata: {
                formId: submission.formId,
                timestamp: submission.metadata.timestamp,
            },
        });

        // Also maintain an index for the form
        const indexKey = `index:${submission.formId}`;
        const existingIndex = await kv.get(indexKey, 'json') as string[] || [];
        existingIndex.unshift(submissionId); // Add to beginning

        // Keep only last 1000 submissions in index
        const trimmedIndex = existingIndex.slice(0, 1000);
        await kv.put(indexKey, JSON.stringify(trimmedIndex));
    } else {
        throw new Error('No storage backend configured');
    }

    return submissionId;
}

/**
 * Get submissions for a specific form
 */
export async function getSubmissions(
    kv?: KVNamespace,
    db?: D1Database,
    formId: string,
    limit: number = 100,
    offset: number = 0
): Promise<StoredSubmission[]> {
    if (db) {
        const result = await db
            .prepare(
                `SELECT id, form_id, data, metadata, created_at
         FROM submissions
         WHERE form_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
            )
            .bind(formId, limit, offset)
            .all();

        return result.results.map((row: any) => ({
            id: row.id,
            formId: row.form_id,
            data: JSON.parse(row.data),
            metadata: JSON.parse(row.metadata),
        }));
    } else if (kv) {
        const indexKey = `index:${formId}`;
        const index = await kv.get(indexKey, 'json') as string[] || [];

        const submissionIds = index.slice(offset, offset + limit);
        const submissions: StoredSubmission[] = [];

        for (const id of submissionIds) {
            const key = `submission:${formId}:${id}`;
            const submission = await kv.get(key, 'json') as StoredSubmission;
            if (submission) {
                submissions.push(submission);
            }
        }

        return submissions;
    }

    return [];
}

/**
 * Get a specific submission by ID
 */
export async function getSubmission(
    kv?: KVNamespace,
    db?: D1Database,
    submissionId: string
): Promise<StoredSubmission | null> {
    if (db) {
        const result = await db
            .prepare(
                `SELECT id, form_id, data, metadata, created_at
         FROM submissions
         WHERE id = ?`
            )
            .bind(submissionId)
            .first();

        if (!result) return null;

        return {
            id: result.id as string,
            formId: result.form_id as string,
            data: JSON.parse(result.data as string),
            metadata: JSON.parse(result.metadata as string),
        };
    } else if (kv) {
        // We need to scan through form indexes to find the submission
        // This is inefficient with KV - D1 is recommended for this use case
        const list = await kv.list({ prefix: 'submission:' });

        for (const key of list.keys) {
            if (key.name.endsWith(`:${submissionId}`)) {
                const submission = await kv.get(key.name, 'json') as StoredSubmission;
                return submission;
            }
        }
    }

    return null;
}
