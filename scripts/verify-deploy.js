#!/usr/bin/env node

/**
 * FormFlare Post-Deployment Verification & Health Diagnostic Script
 * Automatically queries the deployed Worker, verifies active bindings and secrets,
 * and cross-references local overrides (.dev.vars / wrangler.overrides.toml) against
 * the remote deployment.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_URL = process.env.WORKER_URL || 'https://formflare.bmoelk.workers.dev';
const MANIFEST_PATH = path.join(__dirname, '..', 'config-manifest.json');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }
  return null;
}

function getLocalConfigKeys() {
  const localKeys = new Set();

  // 1. Read .dev.vars
  const devVarsPath = path.join(__dirname, '..', '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const lines = fs.readFileSync(devVarsPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([A-Za-z0-9_]+)\s*=/);
      if (match && !match[1].startsWith('#')) {
        localKeys.add(match[1]);
      }
    }
  }

  // 2. Read wrangler.overrides.toml [vars]
  const overridesPath = path.join(__dirname, '..', 'wrangler.overrides.toml');
  if (fs.existsSync(overridesPath)) {
    const lines = fs.readFileSync(overridesPath, 'utf-8').split('\n');
    let inVars = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[vars]') {
        inVars = true;
        continue;
      }
      if (trimmed.startsWith('[') && trimmed !== '[vars]') {
        inVars = false;
        continue;
      }
      if (inVars) {
        const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=/);
        if (match && !match[1].startsWith('#')) {
          localKeys.add(match[1]);
        }
      }
    }
  }

  return Array.from(localKeys);
}

async function verifyDeployment() {
  const targetUrl = process.argv[2] || DEFAULT_URL;
  const manifest = loadManifest();

  console.log(`\n========================================================================`);
  console.log(`🔍 FormFlare Post-Deployment Health & Variable Verification`);
  console.log(`========================================================================`);
  console.log(`Target Worker:   ${targetUrl}`);

  try {
    const response = await fetchJson(targetUrl);

    if (response.statusCode !== 200 || !response.data) {
      console.log(`\n❌ Worker returned status code: ${response.statusCode}`);
      console.log(`Raw response:`, response.raw || response.data);
      console.log(`========================================================================\n`);
      return;
    }

    const { status, environment, version, config } = response.data;

    console.log(`Service Status:  ✅ ${(status || 'healthy').toUpperCase()} (v${version || '1.0.0'})`);
    console.log(`Environment:     ${environment || 'production'}`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`Core Bindings & Configuration Check:`);

    const warnings = [];

    if (!config) {
      console.log(`  ℹ️  Worker running legacy endpoint (deploy latest worker to see full diagnostics)`);
      console.log(`========================================================================\n`);
      return;
    }

    // 1. Storage Check
    if (config.storage === 'none') {
      console.log(`  • Storage:          ⚠️ NONE (Submissions will not be saved to KV/D1)`);
      warnings.push(`Attach a KV namespace or D1 database in wrangler.overrides.toml`);
    } else {
      console.log(`  • Storage:          ✅ ${config.storage.toUpperCase()} Storage Active`);
    }

    // 2. Email Provider & Keys Check
    const emailProvider = config.emailProvider || 'none';
    if (emailProvider === 'none') {
      console.log(`  • Email Provider:   ℹ️  NONE (Email alerts are disabled)`);
    } else {
      console.log(`  • Email Provider:   ✅ ${emailProvider.toUpperCase()}`);

      if (!config.emailToConfigured) {
        console.log(`  • Email Recipient:  ❌ MISSING (EMAIL_TO is not set)`);
        warnings.push(`Set EMAIL_TO in wrangler.overrides.toml or via: npx wrangler secret put EMAIL_TO`);
      } else {
        console.log(`  • Email Recipient:  ✅ Configured (EMAIL_TO)`);
      }

      if (emailProvider !== 'console') {
        if (!config.emailApiKeyConfigured) {
          console.log(`  • Email API Key:    ❌ MISSING (EMAIL_API_KEY is not set)`);
          warnings.push(`Set EMAIL_API_KEY via: npx wrangler secret put EMAIL_API_KEY`);
        } else {
          console.log(`  • Email API Key:    ✅ Configured`);
        }
      }
    }

    // 3. Turnstile Spam Protection Check
    if (!config.turnstileConfigured) {
      console.log(`  • Turnstile Secret: ⚠️ NOT SET (Spam verification will fail in production)`);
      warnings.push(`Set Turnstile Secret Key via: npx wrangler secret put TURNSTILE_SECRET_KEY`);
    } else {
      console.log(`  • Turnstile Secret: ✅ Configured (TURNSTILE_SECRET_KEY)`);
    }

    // 4. Rate Limiting Check
    console.log(`  • Rate Limiting:    ${config.rateLimitEnabled ? '✅ Enabled' : 'ℹ️  Disabled'}`);

    // 5. Cross-Reference Local vs Remote Environment Keys
    const localKeys = getLocalConfigKeys();
    if (localKeys.length > 0 && config.configuredKeys) {
      console.log(`------------------------------------------------------------------------`);
      console.log(`Local vs. Remote Key Cross-Reference:`);
      const remoteKeySet = new Set(config.configuredKeys);

      for (const key of localKeys) {
        if (['DEV_MOCK_TURNSTILE', 'DEV_MODE'].includes(key)) continue;

        if (remoteKeySet.has(key)) {
          console.log(`  • ${key.padEnd(30)} ✅ Provisioned in remote deployment`);
        } else {
          console.log(`  • ${key.padEnd(30)} ❌ MISSING in remote deployment!`);
          warnings.push(`Local key '${key}' is defined locally but missing on remote Worker. Set via: npx wrangler secret put ${key}`);
        }
      }
    }

    console.log(`------------------------------------------------------------------------`);

    if (warnings.length === 0) {
      console.log(`🎉 All required environment variables and bindings are active and verified!`);
    } else {
      console.log(`⚠️  ATTENTION REQUIRED (${warnings.length} warning${warnings.length > 1 ? 's' : ''}):`);
      warnings.forEach((warn, idx) => {
        console.log(`  ${idx + 1}. ${warn}`);
      });
    }

    console.log(`========================================================================\n`);
  } catch (err) {
    console.log(`\n❌ Could not connect to Worker endpoint: ${err.message}`);
    console.log(`Check network connectivity or verify Worker DNS routes.`);
    console.log(`========================================================================\n`);
  }
}

verifyDeployment();
