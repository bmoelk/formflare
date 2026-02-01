/**
 * Simple rate limiting using KV
 */
export async function checkRateLimit(
    kv: KVNamespace | undefined,
    identifier: string,
    maxRequests: number,
    windowSeconds: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!kv) {
        // If no KV is configured, allow all requests
        return { allowed: true };
    }

    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

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
}
