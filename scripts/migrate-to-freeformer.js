#!/usr/bin/env node

/**
 * FreeFormer Codebase Rebranding & Migration Script
 * Recursively scans files in target directory and performs exact brand replacements.
 *
 * Usage:
 *   node scripts/migrate-to-freeformer.js [targetDir] [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetDirArg = args.find(arg => !arg.startsWith('--'));
const rootDir = targetDirArg ? path.resolve(targetDirArg) : path.resolve(__dirname, '..');

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.wrangler', 'dist', 'build']);
const IGNORED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.wasm', '.pdf', '.zip', '.tar', '.gz']);

const REPLACEMENTS = [
    { target: /data-formflare-site/g, replacement: 'data-freeformer-site' },
    { target: /data-formflare/g, replacement: 'data-freeformer' },
    { target: /formflare:success/g, replacement: 'freeformer:success' },
    { target: /formflare:error/g, replacement: 'freeformer:error' },
    { target: /formflare-turnstile-container/g, replacement: 'freeformer-turnstile-container' },
    { target: /formflare-db/g, replacement: 'freeformer-db' },
    { target: /formflare\.bmoelk\.workers\.dev/g, replacement: 'freeformer.bmoelk.workers.dev' },
    { target: /X-FormFlare-Event/g, replacement: 'X-FreeFormer-Event' },
    { target: /X-FormFlare-Signature/g, replacement: 'X-FreeFormer-Signature' },
    { target: /github\.com\/bmoelk\/formflare/g, replacement: 'github.com/bmoelk/freeformer' },
    { target: /https?:\/\/formflare\.io/g, replacement: 'https://brainendeavor.com/freeformer' },
    { target: /FORMFLARE/g, replacement: 'FREEFORMER' },
    { target: /FormFlare/g, replacement: 'FreeFormer' },
    { target: /formflare/g, replacement: 'freeformer' }
];

function processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) return;

    try {
        const originalContent = fs.readFileSync(filePath, 'utf8');
        let newContent = originalContent;
        let totalReplacements = 0;

        for (const { target, replacement } of REPLACEMENTS) {
            const matches = (newContent.match(target) || []).length;
            if (matches > 0) {
                totalReplacements += matches;
                newContent = newContent.replace(target, replacement);
            }
        }

        if (totalReplacements > 0) {
            const relativePath = path.relative(rootDir, filePath);
            console.log(`  [${isDryRun ? 'DRY-RUN' : 'UPDATED'}] ${relativePath} (${totalReplacements} replacement${totalReplacements === 1 ? '' : 's'})`);
            if (!isDryRun) {
                fs.writeFileSync(filePath, newContent, 'utf8');
            }
        }
    } catch (err) {
        console.error(`  [ERROR] Failed to process ${filePath}: ${err.message}`);
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name)) {
                walkDir(path.join(dir, entry.name));
            }
        } else if (entry.isFile()) {
            // Avoid self-modifying the migration script definitions during execution
            if (path.resolve(dir, entry.name) === path.resolve(__filename)) {
                continue;
            }
            processFile(path.join(dir, entry.name));
        }
    }
}

console.log(`\n🚀 Starting FreeFormer Migration Scan...`);
console.log(`   Target Directory: ${rootDir}`);
console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes written)' : 'LIVE (files will be updated)'}\n`);

walkDir(rootDir);

console.log(`\n✨ Migration scan complete.\n`);
