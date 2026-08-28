-- D1 Database Schema for FreeFormer

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    site_id TEXT DEFAULT 'default',
    data TEXT NOT NULL,
    metadata TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Index for faster queries by form_id
CREATE INDEX IF NOT EXISTS idx_form_id ON submissions(form_id);

-- Index for faster queries by site_id and form_id
CREATE INDEX IF NOT EXISTS idx_site_form_created_at ON submissions(site_id, form_id, created_at DESC);

-- Index for faster queries by created_at
CREATE INDEX IF NOT EXISTS idx_created_at ON submissions(created_at DESC);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);
