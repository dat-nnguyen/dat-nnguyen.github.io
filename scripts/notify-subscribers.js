#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { sendEmail, renderNewPostEmail } = require('../backend/interaction-service/services/emailService');

// Optional: load .env.production or .env.development if present
const envProdPath = path.join(__dirname, '../.env.production');
let defaultApiUrl = 'http://localhost:5050';
let envSupabaseUrl = '';
let envSupabaseKey = '';

if (fs.existsSync(envProdPath)) {
  const content = fs.readFileSync(envProdPath, 'utf-8');
  const matchApi = content.match(/VITE_API_BASE_URL=(.+)/);
  if (matchApi && matchApi[1] && !matchApi[1].startsWith('/')) {
    defaultApiUrl = matchApi[1].trim();
  }
  const matchUrl = content.match(/VITE_SUPABASE_URL=(.+)/);
  if (matchUrl && matchUrl[1]) envSupabaseUrl = matchUrl[1].trim();
  const matchKey = content.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
  if (matchKey && matchKey[1]) envSupabaseKey = matchKey[1].trim();
}

// Command-line argument parsing
const args = process.argv.slice(2);
let targetSlug = null;
let force = false;
let apiUrl = process.env.API_BASE_URL || defaultApiUrl;
let adminKey = process.env.ADMIN_KEY || 'admin123';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || envSupabaseUrl;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || envSupabaseKey;

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

function getLatestPost(slugOverride) {
  const postsPath = fs.existsSync(path.join(__dirname, '../dist/data/posts.json'))
    ? path.join(__dirname, '../dist/data/posts.json')
    : path.join(__dirname, '../frontend/public/data/posts.json');

  if (!fs.existsSync(postsPath)) return null;

  try {
    const posts = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));
    if (!posts || posts.length === 0) return null;
    if (slugOverride) {
      return posts.find((p) => p.slug === slugOverride) || null;
    }
    // Return newest post
    return posts[0];
  } catch (err) {
    console.error('Error reading posts:', err);
    return null;
  }
}

async function notifyViaSupabase(supabase) {
  const post = getLatestPost(targetSlug);
  if (!post) {
    console.log('ℹ️ No blog post found to notify.');
    return;
  }

  const slug = post.slug;
  const siteUrl = process.env.SITE_URL || 'https://dat-nnguyen.github.io';
  const postUrl = `${siteUrl}/#post/${slug}`;

  // Check if already notified
  if (!force) {
    const { data: existing, error: checkErr } = await supabase
      .from('sent_notifications')
      .select('id, sent_at')
      .eq('post_slug', slug)
      .maybeSingle();

    if (!checkErr && existing) {
      console.log(`ℹ️ Post "${post.title}" (${slug}) was already notified on ${existing.sent_at}. Use --force to re-send.`);
      return;
    }
  }

  // Fetch active subscribers
  const { data: subscribers, error: subErr } = await supabase
    .from('subscribers')
    .select('email, unsubscribe_token')
    .eq('is_active', true);

  if (subErr) {
    console.error('❌ Failed to fetch subscribers from Supabase:', subErr.message);
    return;
  }

  if (!subscribers || subscribers.length === 0) {
    console.log(`ℹ️ No active subscribers found in Supabase. Nothing to send.`);
    return;
  }

  console.log(`📨 Found ${subscribers.length} active subscriber(s). Broadcasting post: "${post.title}"...`);

  // Strip HTML for plain excerpt preview
  const plainText = (post.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const postExcerpt = plainText.length > 220 ? plainText.substring(0, 220) + '...' : plainText;

  let sentCount = 0;
  for (const sub of subscribers) {
    const unsubUrl = `${siteUrl}/#unsubscribe?token=${sub.unsubscribe_token || ''}`;
    const emailHtml = renderNewPostEmail({
      postTitle: post.title,
      postExcerpt,
      readingTime: post.readingTime || '2 min read',
      postUrl,
      unsubscribeUrl: unsubUrl,
      siteUrl,
    });

    try {
      await sendEmail({
        to: sub.email,
        subject: `New Post: ${post.title}`,
        html: emailHtml,
      });
      sentCount++;
    } catch (sendErr) {
      console.warn(`⚠️ Failed to send to ${sub.email}:`, sendErr.message);
    }
  }

  // Record in sent_notifications table
  try {
    await supabase.from('sent_notifications').insert([
      {
        post_slug: slug,
        recipient_count: sentCount,
      },
    ]);
  } catch (recErr) {
    console.warn('Notice: Could not record notification log:', recErr.message);
  }

  console.log(`✅ Successfully notified ${sentCount} subscriber(s) for "${post.title}"!`);
}

async function notifyViaApi() {
  console.log(`🌐 Target API Endpoint: ${apiUrl}/api/subscribers/notify-published`);

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
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.log('Tip: Set SUPABASE_URL & SUPABASE_KEY or ensure backend is running.');
  }
}

async function runNotification() {
  console.log('------------------------------------------------------------');
  console.log('📣 Personal Website — Subscriber Notification Broadcast');
  if (targetSlug) {
    console.log(`📄 Specified Post Slug: ${targetSlug}`);
  } else {
    console.log('📄 Post Slug: Auto-detecting latest published post...');
  }
  if (force) {
    console.log('⚡ Force Mode: Enabled (re-send even if previously notified)');
  }
  console.log('------------------------------------------------------------');

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
    console.log(`⚡ Supabase Mode: Connecting directly to ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    await notifyViaSupabase(supabase);
  } else {
    await notifyViaApi();
  }
  console.log('------------------------------------------------------------');
}

if (require.main === module) {
  runNotification();
}

module.exports = {
  getLatestPost,
  notifyViaSupabase,
  notifyViaApi,
  runNotification,
};
