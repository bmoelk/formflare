import { nanoid } from 'nanoid';

export interface FormSubmission {
    formId: string;
    siteId?: string;
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
 * Supports multi-tenant per-site KV partitioning and D1 database storage
 */
export async function storeSubmission(
    submission: FormSubmission,
    kv?: KVNamespace,
    db?: D1Database,
): Promise<string> {
    const submissionId = nanoid();
    const site = submission.siteId || 'default';
    const storedSubmission: StoredSubmission = {
        id: submissionId,
        ...submission,
        siteId: site,
    };

    // Prefer D1 if available, fallback to KV
    if (db) {
        await db
            .prepare(
                `INSERT INTO submissions (id, form_id, site_id, data, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
                submissionId,
                submission.formId,
                site,
                JSON.stringify(submission.data),
                JSON.stringify(submission.metadata),
                submission.metadata.timestamp
            )
            .run();
    } else if (kv) {
        // Multi-tenant hierarchical key: submission:<siteId>:<formId>:<submissionId>
        const key = `submission:${site}:${submission.formId}:${submissionId}`;
        await kv.put(key, JSON.stringify(storedSubmission), {
            metadata: {
                formId: submission.formId,
                siteId: site,
                timestamp: submission.metadata.timestamp,
            },
        });

        // Maintain multi-tenant index for the form: index:<siteId>:<formId>
        const indexKey = `index:${site}:${submission.formId}`;
        const existingIndex = (await kv.get(indexKey, 'json')) as string[] || [];
        existingIndex.unshift(submissionId); // Add to beginning

        // Keep only last 1000 submissions in index
        const trimmedIndex = existingIndex.slice(0, 1000);
        await kv.put(indexKey, JSON.stringify(trimmedIndex));
    } else {
        console.warn('⚠️ No storage backend (KV or D1) bound. Submission processed without persistence.');
    }

    return submissionId;
}

/**
 * Get submissions for a specific form and optional site
 */
export async function getSubmissions(
    kv: KVNamespace | undefined,
    db: D1Database | undefined,
    formId: string,
    siteId?: string,
    limit: number = 100,
    offset: number = 0
): Promise<StoredSubmission[]> {
    if (db) {
        let query = `SELECT id, form_id, site_id, data, metadata, created_at
         FROM submissions
         WHERE form_id = ?`;
        const params: any[] = [formId];

        if (siteId) {
            query += ` AND site_id = ?`;
            params.push(siteId);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const result = await db.prepare(query).bind(...params).all();

        return result.results.map((row: any) => ({
            id: row.id,
            formId: row.form_id,
            siteId: row.site_id,
            data: JSON.parse(row.data),
            metadata: JSON.parse(row.metadata),
        }));
    } else if (kv) {
        const site = siteId || 'default';
        let indexKey = `index:${site}:${formId}`;
        let index = (await kv.get(indexKey, 'json')) as string[] | null;

        // Fallback for legacy keys if no submissions found in site partition
        if (!index || index.length === 0) {
            const legacyIndexKey = `index:${formId}`;
            const legacyIndex = (await kv.get(legacyIndexKey, 'json')) as string[] | null;
            if (legacyIndex && legacyIndex.length > 0) {
                index = legacyIndex;
                indexKey = legacyIndexKey;
            }
        }

        if (!index) return [];

        const submissionIds = index.slice(offset, offset + limit);
        const submissions: StoredSubmission[] = [];

        for (const id of submissionIds) {
            // Check hierarchical site key first
            let key = `submission:${site}:${formId}:${id}`;
            let submission = (await kv.get(key, 'json')) as StoredSubmission | null;

            // Fallback check for legacy non-partitioned key
            if (!submission) {
                key = `submission:${formId}:${id}`;
                submission = (await kv.get(key, 'json')) as StoredSubmission | null;
            }

            if (submission) {
                submissions.push(submission);
            }
        }

        return submissions;
    }

    return [];
}

/**
 * Get a specific submission by ID with optional site and form routing
 */
export async function getSubmission(
    kv: KVNamespace | undefined,
    db: D1Database | undefined,
    submissionId: string,
    siteId?: string,
    formId?: string
): Promise<StoredSubmission | null> {
    if (db) {
        const result = await db
            .prepare(
                `SELECT id, form_id, site_id, data, metadata, created_at
         FROM submissions
         WHERE id = ?`
            )
            .bind(submissionId)
            .first();

        if (!result) return null;

        return {
            id: result.id as string,
            formId: result.form_id as string,
            siteId: result.site_id as string,
            data: JSON.parse(result.data as string),
            metadata: JSON.parse(result.metadata as string),
        };
    } else if (kv) {
        // Fast direct path if siteId and formId are supplied
        if (siteId && formId) {
            const directKey = `submission:${siteId}:${formId}:${submissionId}`;
            const directSub = (await kv.get(directKey, 'json')) as StoredSubmission | null;
            if (directSub) return directSub;
        }

        // Fast path for default partition
        if (formId) {
            const defaultKey = `submission:default:${formId}:${submissionId}`;
            const defaultSub = (await kv.get(defaultKey, 'json')) as StoredSubmission | null;
            if (defaultSub) return defaultSub;

            const legacyKey = `submission:${formId}:${submissionId}`;
            const legacySub = (await kv.get(legacyKey, 'json')) as StoredSubmission | null;
            if (legacySub) return legacySub;
        }

        // Fallback scan
        const list = await kv.list({ prefix: 'submission:' });
        for (const key of list.keys) {
            if (key.name.endsWith(`:${submissionId}`)) {
                const submission = (await kv.get(key.name, 'json')) as StoredSubmission;
                return submission;
            }
        }
    }

    return null;
}
