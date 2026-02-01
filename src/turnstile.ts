/**
 * Verify Cloudflare Turnstile token
 */
export async function verifyTurnstile(
    token: string,
    secretKey: string,
    remoteIP: string
): Promise<{
    success: boolean;
    score?: number;
    errors?: string[];
}> {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    formData.append('remoteip', remoteIP);

    try {
        const response = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                body: formData,
            }
        );

        const result = await response.json() as {
            success: boolean;
            score?: number;
            'error-codes'?: string[];
            challenge_ts?: string;
            hostname?: string;
        };

        return {
            success: result.success,
            score: result.score,
            errors: result['error-codes'],
        };
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return {
            success: false,
            errors: ['verification-failed'],
        };
    }
}
