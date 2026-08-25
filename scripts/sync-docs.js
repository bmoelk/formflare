#!/usr/bin/env node

/**
 * FormFlare Documentation Synchronization Script
 * Generates the Markdown Environment Variables reference table in docs/SETUP.md
 * directly from the single source of truth: config-manifest.json
 *
 * Usage:
 *   node scripts/sync-docs.js          # Updates docs/SETUP.md
 *   node scripts/sync-docs.js --check  # Verifies docs/SETUP.md is in sync (used in pre-commit)
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'config-manifest.json');
const SETUP_DOC_PATH = path.join(__dirname, '..', 'docs', 'SETUP.md');

const START_MARKER = '<!-- CONFIG_TABLE_START -->';
const END_MARKER = '<!-- CONFIG_TABLE_END -->';

function generateMarkdownTable(manifest) {
  const rows = [
    '| Variable / Secret Name | Kind | Required? | Default | Description |',
    '| :--- | :--- | :--- | :--- | :--- |',
  ];

  for (const item of manifest.variables) {
    let reqText = 'Optional';
    if (item.required === true) {
      reqText = 'Yes';
    } else if (item.requiredIf && item.requiredIf.condition) {
      reqText = `Required (${item.requiredIf.condition})`;
    }

    const defaultVal = item.default ? `\`${item.default}\`` : '-';
    const escapedDesc = item.description.replace(/\|/g, '\\|');

    rows.push(
      `| \`${item.name}\` | ${item.kind} | ${reqText} | ${defaultVal} | ${escapedDesc} |`
    );
  }

  return rows.join('\n');
}

function syncDocs(isCheckMode = false) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ Error: Manifest file not found at: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(SETUP_DOC_PATH)) {
    console.error(`❌ Error: Setup doc file not found at: ${SETUP_DOC_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const currentDocContent = fs.readFileSync(SETUP_DOC_PATH, 'utf-8');

  const startIndex = currentDocContent.indexOf(START_MARKER);
  const endIndex = currentDocContent.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    console.error(
      `❌ Error: Markers '${START_MARKER}' and '${END_MARKER}' not found in docs/SETUP.md`
    );
    process.exit(1);
  }

  const generatedTable = generateMarkdownTable(manifest);
  const expectedSection = `${START_MARKER}\n\n${generatedTable}\n\n${END_MARKER}`;

  const before = currentDocContent.substring(0, startIndex);
  const after = currentDocContent.substring(endIndex + END_MARKER.length);
  const updatedDocContent = `${before}${expectedSection}${after}`;

  const currentSection = currentDocContent.substring(startIndex, endIndex + END_MARKER.length);

  if (isCheckMode) {
    if (currentSection !== expectedSection) {
      console.error(`\n❌ Documentation Drift Detected!`);
      console.error(
        `The configuration table in 'docs/SETUP.md' does not match 'config-manifest.json'.`
      );
      console.error(`💡 Run 'npm run sync-docs' to synchronize documentation before committing.\n`);
      process.exit(1);
    }
    console.log(`✅ Documentation is fully synchronized with config-manifest.json.`);
    process.exit(0);
  }

  fs.writeFileSync(SETUP_DOC_PATH, updatedDocContent, 'utf-8');
  console.log(`✅ Successfully synchronized docs/SETUP.md with config-manifest.json!`);
}

const isCheck = process.argv.includes('--check');
syncDocs(isCheck);
