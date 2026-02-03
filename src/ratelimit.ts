/**
 * Simple rate limiting using KV
 */
/**
 * Rate limiting using KV or D1
 */
export async function checkRateLimit(
    kv: KVNamespace | undefined,
    db: D1Database | undefined,
    identifier: string,
    maxRequests: number,
    windowSeconds: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Prefer KV for rate limiting (faster), but fallback to D1 if only DB is available
    if (kv) {
        // Get existing rate limit data
        const existing = await kv.get(key, 'json') as {
            count: number;
            resetAt: number;
        } | null;

        // If no existing data or window has expired, create new window
        if (!existing || now >= existing.resetAt) {
            await kv.put(
                key,
                JSON.stringify({
                    count: 1,
                    resetAt: now + windowMs,
                }),
                {
                    expirationTtl: windowSeconds,
                }
            );
            return { allowed: true };
        }

        // Check if limit exceeded
        if (existing.count >= maxRequests) {
            const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
            return { allowed: false, retryAfter };
        }

        // Increment counter
        await kv.put(
            key,
            JSON.stringify({
                count: existing.count + 1,
                resetAt: existing.resetAt,
            }),
            {
                expirationTtl: Math.ceil((existing.resetAt - now) / 1000),
            }
        );

        return { allowed: true };
    } else if (db) {
        try {
            // Get existing rate limit data from D1
            const existing = await db
                .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
                .bind(key)
                .first() as { count: number; reset_at: number } | null;

            // If no existing data or window has expired, create new window
            if (!existing || now >= existing.reset_at) {
                // Remove potentially old entry first (if expired)
                if (existing) {
                    await db.prepare('DELETE FROM rate_limits WHERE key = ?').bind(key).run();
                }

                await db
                    .prepare('INSERT INTO rate_limits (key, count, reset_at) VALUES (?, ?, ?)')
                    .bind(key, 1, now + windowMs)
                    .run();
                return { allowed: true };
            }

            // Check if limit exceeded
            if (existing.count >= maxRequests) {
                const retryAfter = Math.ceil((existing.reset_at - now) / 1000);
                return { allowed: false, retryAfter };
            }

            // Increment counter
            await db
                .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
                .bind(key)
                .run();

            return { allowed: true };
        } catch (error) {
            console.error('Rate limit D1 error:', error);
            // Fail open on database error to avoid blocking legitimate traffic due to infrastructure issues
            return { allowed: true };
        }
    }

    // If no storage configured, allow all requests
    return { allowed: true };
}
