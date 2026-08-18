/**
 * Verify Cloudflare Turnstile token
 */
export async function verifyTurnstile(
    token: string,
    secretKey: string,
    remoteIP: string,
    isDevMock: boolean = false
): Promise<{
    success: boolean;
    score?: number;
    errors?: string[];
}> {
    // Explicit Dev Mode or Dummy Test Token Auto-Pass
    if (
        isDevMock ||
        token === 'dev' ||
        token === '1x00000000000000000000AA' ||
        secretKey === '1x00000000000000000000AA00000000000'
    ) {
        console.log('⚡ [FormFlare Turnstile] Dev Mock Verification Auto-Passed');
        return {
            success: true,
            score: 1.0,
        };
    }

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

        const result = (await response.json()) as {
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
