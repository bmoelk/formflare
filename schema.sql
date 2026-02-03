-- D1 Database Schema for FormFlare

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    data TEXT NOT NULL,
    metadata TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Index for faster queries by form_id
CREATE INDEX IF NOT EXISTS idx_form_id ON submissions(form_id);

-- Index for faster queries by created_at
CREATE INDEX IF NOT EXISTS idx_created_at ON submissions(created_at DESC);

-- Composite index for form_id and created_at
CREATE INDEX IF NOT EXISTS idx_form_id_created_at ON submissions(form_id, created_at DESC);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);
