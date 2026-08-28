import { describe, it, expect } from 'vitest';
import { getSiteEnvVariants, resolveSiteEnv } from './index';

describe('FreeFormer Unit Tests', () => {
    describe('getSiteEnvVariants', () => {
        it('resolves site-specific variants correctly', () => {
            const variants = getSiteEnvVariants('TURNSTILE_SITE_KEY', 'splitphase.io');
            expect(variants).toContain('TURNSTILE_SITE_KEY_SPLITPHASE_IO');
            expect(variants).toContain('TURNSTILE_SITE_KEY_SPLITPHASEIO');
            expect(variants).toContain('TURNSTILE_SITE_KEY_SPLITPHASE');
            expect(variants).toContain('TURNSTILE_SITE_KEY');
        });

        it('handles simple site identifiers without dots', () => {
            const variants = getSiteEnvVariants('EMAIL_TO', 'brainendeavor');
            expect(variants).toContain('EMAIL_TO_BRAINENDEAVOR');
            expect(variants).toContain('EMAIL_TO');
        });
    });

    describe('resolveSiteEnv', () => {
        it('prefers exact site match over global fallback', () => {
            const env = {
                EMAIL_TO: 'global@example.com',
                EMAIL_TO_BRAINENDEAVOR: 'brian@brainendeavor.com',
            };
            const result = resolveSiteEnv(env, 'EMAIL_TO', 'brainendeavor');
            expect(result).toBe('brian@brainendeavor.com');
        });

        it('falls back to global variable when site variable is absent', () => {
            const env = {
                EMAIL_TO: 'global@example.com',
            };
            const result = resolveSiteEnv(env, 'EMAIL_TO', 'other-site');
            expect(result).toBe('global@example.com');
        });
    });
});
