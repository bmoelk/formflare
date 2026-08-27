/**
 * FormFlare Edge Logger
 * Lightweight, zero-dependency structured logger with configurable log levels
 * and Cloudflare Workers Observability integration.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4,
};

export interface LoggerOptions {
    logLevel?: string;
    environment?: string;
    tag?: string;
}

/**
 * Resolve active LogLevel based on explicit setting or environment defaults:
 * - production  -> warn  (only logs actionable warnings and critical errors; zero submission info/PII)
 * - staging     -> info  (logs high-level dispatch lifecycle without granular CORS traces)
 * - development -> debug (full verbose diagnostics, CORS rules, dev mock auto-passes)
 */
export function resolveLogLevel(explicitLevel?: string, environment?: string): LogLevel {
    if (explicitLevel) {
        const normalized = explicitLevel.toLowerCase().trim() as LogLevel;
        if (normalized in LOG_LEVEL_SEVERITY) {
            return normalized;
        }
    }

    const env = (environment || 'development').toLowerCase().trim();
    if (env === 'production') {
        return 'warn';
    }
    if (env === 'staging') {
        return 'info';
    }
    return 'debug';
}

export class Logger {
    private currentLevel: LogLevel;
    private minSeverity: number;
    private defaultTag?: string;

    constructor(options: LoggerOptions = {}) {
        this.currentLevel = resolveLogLevel(options.logLevel, options.environment);
        this.minSeverity = LOG_LEVEL_SEVERITY[this.currentLevel];
        this.defaultTag = options.tag;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_SEVERITY[level] >= this.minSeverity;
    }

    private formatMessage(tag: string | undefined, message: string): string {
        const prefix = tag || this.defaultTag;
        return prefix ? `[${prefix}] ${message}` : message;
    }

    debug(tag: string, message: string, meta?: any): void {
        if (!this.shouldLog('debug')) return;
        const msg = this.formatMessage(tag, message);
        if (meta !== undefined) {
            console.log(msg, meta);
        } else {
            console.log(msg);
        }
    }

    info(tag: string, message: string, meta?: any): void {
        if (!this.shouldLog('info')) return;
        const msg = this.formatMessage(tag, message);
        if (meta !== undefined) {
            console.log(msg, meta);
        } else {
            console.log(msg);
        }
    }

    warn(tag: string, message: string, meta?: any): void {
        if (!this.shouldLog('warn')) return;
        const msg = this.formatMessage(tag, message);
        if (meta !== undefined) {
            console.warn(msg, meta);
        } else {
            console.warn(msg);
        }
    }

    error(tag: string, message: string, error?: any): void {
        if (!this.shouldLog('error')) return;
        const msg = this.formatMessage(tag, message);
        if (error !== undefined) {
            console.error(msg, error);
        } else {
            console.error(msg);
        }
    }

    getLevel(): LogLevel {
        return this.currentLevel;
    }

    child(subTag: string): Logger {
        const fullTag = this.defaultTag ? `${this.defaultTag}:${subTag}` : subTag;
        const childLogger = new Logger({ tag: fullTag });
        childLogger.currentLevel = this.currentLevel;
        childLogger.minSeverity = this.minSeverity;
        return childLogger;
    }
}

/**
 * Helper to instantiate a contextual Logger from Cloudflare Worker env bindings
 */
export function createLogger(env?: Record<string, string | undefined>, tag?: string): Logger {
    return new Logger({
        logLevel: env?.LOG_LEVEL,
        environment: env?.ENVIRONMENT,
        tag,
    });
}
