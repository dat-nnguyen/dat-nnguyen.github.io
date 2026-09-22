#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Optional: load .env.production or .env.development if present
const envProdPath = path.join(__dirname, '../.env.production');
let defaultApiUrl = 'http://localhost:5050';

if (fs.existsSync(envProdPath)) {
  const content = fs.readFileSync(envProdPath, 'utf-8');
  const match = content.match(/VITE_API_BASE_URL=(.+)/);
  if (match && match[1] && !match[1].startsWith('/')) {
    defaultApiUrl = match[1].trim();
  }
}

// Command-line argument parsing
const args = process.argv.slice(2);
let targetSlug = null;
let force = false;
let apiUrl = process.env.API_BASE_URL || defaultApiUrl;
let adminKey = process.env.ADMIN_KEY || 'admin123';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--slug' && args[i + 1]) {
    targetSlug = args[i + 1];
    i++;
  } else if (args[i] === '--force') {
    force = true;
  } else if (args[i] === '--api' && args[i + 1]) {
    apiUrl = args[i + 1];
    i++;
  } else if (args[i] === '--key' && args[i + 1]) {
    adminKey = args[i + 1];
    i++;
  } else if (args[i] === '--local') {
    apiUrl = 'http://localhost:5050';
  }
}

async function runNotification() {
  console.log('------------------------------------------------------------');
  console.log('📣 Personal Website — Subscriber Notification Broadcast');
  console.log(`🌐 Target API Endpoint: ${apiUrl}/api/subscribers/notify-published`);
  if (targetSlug) {
    console.log(`📄 Specified Post Slug: ${targetSlug}`);
  } else {
    console.log('📄 Post Slug: Auto-detecting latest published markdown post...');
  }
  if (force) {
    console.log('⚡ Force Mode: Enabled (re-send even if previously notified)');
  }
  console.log('------------------------------------------------------------');

  try {
    const response = await fetch(`${apiUrl}/api/subscribers/notify-published`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        slug: targetSlug,
        force,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ Request failed (${response.status}):`, result.error || result);
      process.exit(1);
    }

    if (!result.success) {
      console.log(`ℹ️ ${result.message}`);
      process.exit(0);
    }

    console.log(`✅ ${result.message}`);
    if (result.post) {
      console.log(`   Title:   "${result.post.title}"`);
      console.log(`   Slug:    ${result.post.slug}`);
      console.log(`   URL:     ${result.post.url}`);
    }
    console.log(`   Sent to: ${result.sentCount} subscriber(s)`);
    if (result.dryRun) {
      console.log(`   Mode:    Mock / Dry-Run (No RESEND_API_KEY or SMTP set on server)`);
    }
    console.log('------------------------------------------------------------');
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.log('\nTip: If testing locally, make sure your backend is running: `npm start`');
    process.exit(1);
  }
}

runNotification();
