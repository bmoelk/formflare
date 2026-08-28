#!/bin/bash
# FreeFormer Dynamic Pre-Commit Security Scanner
# Dynamically detects leaked credentials, email patterns, and domain route bindings in staged files.

ERRORS=0

echo "🔍 Running FreeFormer Pre-Commit Security & Docs Quality Gate..."

# 0. Check if documentation is in sync with config-manifest.json
node scripts/sync-docs.js --check
if [ $? -ne 0 ]; then
    ERRORS=$((ERRORS+1))
fi

# 1. Check if .dev.vars or wrangler.overrides.toml are accidentally staged
STAGED_PRIVATE_FILES=$(git diff --cached --name-only | grep -E '^(\.dev\.vars|wrangler\.overrides\.toml|wrangler\.local\.toml)$')
if [ -n "$STAGED_PRIVATE_FILES" ]; then
    echo "❌ ERROR: Private configuration file(s) staged for commit:"
    echo "$STAGED_PRIVATE_FILES"
    echo "💡 Run 'git reset HEAD <file>' to unstage."
    ERRORS=$((ERRORS+1))
fi

# 2. Check for hardcoded API keys, Turnstile tokens, or secrets in any staged code
SECRET_PATTERNS='(0x4[A-Za-z0-9_-]{20,}|sk_live_[0-9a-zA-Z]{24,}|sk_test_[0-9a-zA-Z]{24,}|key-[0-9a-zA-Z]{32,})'
LEAKS=$(git diff --cached -U0 | grep -E "^\+" | grep -E "$SECRET_PATTERNS")
if [ -n "$LEAKS" ]; then
    echo "❌ ERROR: Detected potential secret API key or Turnstile token in staged code:"
    echo "$LEAKS"
    ERRORS=$((ERRORS+1))
fi

# 3. Dynamic check for hardcoded email addresses or domain route triggers in public wrangler.toml
if git diff --cached --name-only | grep -q 'wrangler\.toml$'; then
    # Dynamic Email Regex (catches any email address string in wrangler.toml)
    EMAIL_LEAKS=$(git diff --cached wrangler.toml | grep -E "^\+" | grep -E '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    if [ -n "$EMAIL_LEAKS" ]; then
        echo "❌ ERROR: Hardcoded email address detected in wrangler.toml:"
        echo "$EMAIL_LEAKS"
        echo "💡 Move private emails to Cloudflare Secrets (npx wrangler secret put EMAIL_FROM)."
        ERRORS=$((ERRORS+1))
    fi

    # Dynamic Domain Route Regex (catches any custom route patterns or zone_name definitions in wrangler.toml)
    ROUTE_LEAKS=$(git diff --cached wrangler.toml | grep -E "^\+" | grep -E '(pattern\s*=\s*".*"|zone_name\s*=\s*".*"|custom_domain\s*=\s*true)')
    if [ -n "$ROUTE_LEAKS" ]; then
        echo "❌ ERROR: Hardcoded custom domain route configuration detected in public wrangler.toml:"
        echo "$ROUTE_LEAKS"
        echo "💡 Move custom domain routes to Cloudflare Dashboard UI or untracked wrangler.overrides.toml."
        ERRORS=$((ERRORS+1))
    fi
fi

if [ $ERRORS -gt 0 ]; then
    echo "🚨 Security scan failed with $ERRORS error(s). Aborting commit."
    exit 1
fi

echo "✅ Dynamic security scan passed cleanly!"
exit 0
