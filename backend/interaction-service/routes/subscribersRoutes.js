const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const {
  sendEmail,
  renderNewPostEmail,
  renderWelcomeEmail,
  renderUnsubscribePage,
} = require('../services/emailService');

// In-memory / file backup for local dev or when PostgreSQL is unavailable
const fallbackFilePath = path.join(__dirname, '../subscribers.json');
const sentNotificationsFilePath = path.join(__dirname, '../sent_notifications.json');

let inMemorySubscribers = [];
let inMemorySentNotifications = [];

try {
  if (fs.existsSync(fallbackFilePath)) {
    inMemorySubscribers = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf-8'));
  }
} catch {
  inMemorySubscribers = [];
}

try {
  if (fs.existsSync(sentNotificationsFilePath)) {
    inMemorySentNotifications = JSON.parse(fs.readFileSync(sentNotificationsFilePath, 'utf-8'));
  }
} catch {
  inMemorySentNotifications = [];
}

function saveSubscribersBackup() {
  try {
    fs.writeFileSync(fallbackFilePath, JSON.stringify(inMemorySubscribers, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Could not write subscribers backup file:', err.message);
  }
}

function saveSentNotificationsBackup() {
  try {
    fs.writeFileSync(sentNotificationsFilePath, JSON.stringify(inMemorySentNotifications, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Could not write sent notifications backup file:', err.message);
  }
}

function getSiteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const host = req ? req.get('host') : null;
  const protocol = req && req.protocol ? req.protocol : 'http';
  if (host) return `${protocol}://${host}`;
  return 'https://dat-nnguyen.github.io';
}

function getApiBaseUrl(req) {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/+$/, '');
  const host = req ? req.get('host') : null;
  const protocol = req && req.protocol ? req.protocol : 'http';
  if (host) return `${protocol}://${host}`;
  return 'http://localhost:5050';
}

function getPostsDirectory() {
  const candidates = [
    path.join(__dirname, '../../content-service/markdown_content/posts'),
    path.join(__dirname, '../markdown_content/posts'),
    path.join(process.cwd(), 'backend/content-service/markdown_content/posts'),
    path.join(process.cwd(), 'content-service/markdown_content/posts'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

function getPostDetailsBySlug(targetSlug) {
  const postsDir = getPostsDirectory();
  if (!fs.existsSync(postsDir)) return null;

  const files = fs.readdirSync(postsDir);
  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(postsDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(rawContent);
      const slug = parsed.data.slug || file.replace('.md', '');

      if (!targetSlug || slug === targetSlug) {
        // Extract excerpt (look for TL;DR blockquote or first clean paragraph)
        let excerpt = '';
        const lines = parsed.content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('>')) {
            excerpt = trimmed.replace(/^>\s*/, '').replace(/\*\*TL;DR:?\*\*/i, '').trim();
            break;
          }
          if (trimmed.length > 40 && !trimmed.startsWith('#') && !trimmed.startsWith('!')) {
            excerpt = trimmed;
            break;
          }
        }
        if (!excerpt) {
          excerpt = parsed.content.replace(/#+\s+.*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 180).trim() + '...';
        }

        const words = parsed.content.trim().split(/\s+/).filter(Boolean).length;
        const mins = Math.max(1, Math.ceil(words / 200));

        return {
          title: parsed.data.title || file.replace('.md', ''),
          slug,
          category: parsed.data.category || 'technical',
          date: parsed.data.date || new Date().toISOString(),
          readingTime: `${mins} min read`,
          excerpt,
        };
      }
    }
  }
  return null;
}

function getLatestPostDetails() {
  const postsDir = getPostsDirectory();
  if (!fs.existsSync(postsDir)) return null;

  const files = fs.readdirSync(postsDir);
  const posts = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(postsDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(rawContent);
      const slug = parsed.data.slug || file.replace('.md', '');

      let excerpt = '';
      const lines = parsed.content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
          excerpt = trimmed.replace(/^>\s*/, '').replace(/\*\*TL;DR:?\*\*/i, '').trim();
          break;
        }
        if (trimmed.length > 40 && !trimmed.startsWith('#') && !trimmed.startsWith('!')) {
          excerpt = trimmed;
          break;
        }
      }
      if (!excerpt) {
        excerpt = parsed.content.replace(/#+\s+.*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 180).trim() + '...';
      }

      const words = parsed.content.trim().split(/\s+/).filter(Boolean).length;
      const mins = Math.max(1, Math.ceil(words / 200));

      posts.push({
        title: parsed.data.title || file.replace('.md', ''),
        slug,
        category: parsed.data.category || 'technical',
        date: parsed.data.date || new Date().toISOString(),
        readingTime: `${mins} min read`,
        excerpt,
      });
    }
  }

  if (posts.length === 0) return null;
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts[0];
}

module.exports = (pool) => {
  // 1. Subscribe with email
  router.post('/', async (req, res) => {
    try {
      const { email } = req.body || {};

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      const token = crypto.randomBytes(24).toString('hex');
      let isPg = false;
      let alreadyActive = false;

      try {
        // Try PostgreSQL
        const existing = await pool.query('SELECT * FROM subscribers WHERE email = $1;', [normalizedEmail]);
        if (existing.rows && existing.rows.length > 0) {
          const sub = existing.rows[0];
          if (sub.is_active) {
            alreadyActive = true;
          } else {
            // Reactivate
            await pool.query(
              'UPDATE subscribers SET is_active = TRUE, unsubscribe_token = $1 WHERE email = $2;',
              [token, normalizedEmail]
            );
          }
        } else {
          await pool.query(
            'INSERT INTO subscribers (email, unsubscribe_token, is_active) VALUES ($1, $2, TRUE);',
            [normalizedEmail, token]
          );
        }
        isPg = true;
      } catch (dbErr) {
        // Fallback to in-memory / JSON file
        const index = inMemorySubscribers.findIndex((s) => s.email === normalizedEmail);
        if (index >= 0) {
          if (inMemorySubscribers[index].is_active) {
            alreadyActive = true;
          } else {
            inMemorySubscribers[index].is_active = true;
            inMemorySubscribers[index].unsubscribe_token = token;
            saveSubscribersBackup();
          }
        } else {
          inMemorySubscribers.push({
            id: Date.now(),
            email: normalizedEmail,
            unsubscribe_token: token,
            is_active: true,
            created_at: new Date().toISOString(),
          });
          saveSubscribersBackup();
        }
      }

      if (alreadyActive) {
        return res.status(200).json({
          success: true,
          message: "You're already subscribed! You'll receive an email as soon as a new post is out.",
        });
      }

      // Send welcome confirmation email in background
      const siteUrl = getSiteUrl(req);
      const apiBase = getApiBaseUrl(req);
      const unsubscribeUrl = `${apiBase}/api/subscribers/unsubscribe?token=${token}`;

      sendEmail({
        to: normalizedEmail,
        subject: "You're subscribed to Dat Nguyen's Blog",
        html: renderWelcomeEmail({ siteUrl, unsubscribeUrl }),
      }).catch((err) => {
        console.warn('[Subscribers] Welcome email dispatch notice:', err.message);
      });

      return res.status(201).json({
        success: true,
        message: "Thank you for subscribing! You'll be notified whenever I publish a new blog post.",
      });
    } catch (err) {
      console.error('[Subscribers] Subscription error:', err);
      res.status(500).json({ error: 'Failed to process subscription. Please try again.' });
    }
  });

  // 2. Unsubscribe via one-click token link
  router.get('/unsubscribe', async (req, res) => {
    try {
      const { token } = req.query;
      const siteUrl = getSiteUrl(req);

      if (!token) {
        return res.send(renderUnsubscribePage({ success: false, siteUrl }));
      }

      let unsubscribedEmail = null;
      let isSuccess = false;

      try {
        const result = await pool.query(
          'UPDATE subscribers SET is_active = FALSE WHERE unsubscribe_token = $1 RETURNING email;',
          [token]
        );
        if (result.rows && result.rows.length > 0) {
          unsubscribedEmail = result.rows[0].email;
          isSuccess = true;
        }
      } catch (dbErr) {
        const sub = inMemorySubscribers.find((s) => s.unsubscribe_token === token);
        if (sub) {
          sub.is_active = false;
          unsubscribedEmail = sub.email;
          isSuccess = true;
          saveSubscribersBackup();
        }
      }

      res.send(renderUnsubscribePage({ success: isSuccess, email: unsubscribedEmail, siteUrl }));
    } catch (err) {
      console.error('[Subscribers] Unsubscribe error:', err);
      res.status(500).send('An error occurred while processing your unsubscribe request.');
    }
  });

  // 3. Get subscriber count
  router.get('/count', async (req, res) => {
    try {
      let count = 0;
      try {
        const result = await pool.query('SELECT COUNT(*) as count FROM subscribers WHERE is_active = TRUE;');
        count = parseInt(result.rows[0].count, 10);
      } catch {
        count = inMemorySubscribers.filter((s) => s.is_active).length;
      }
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch subscriber count' });
    }
  });

  // 4. Notify subscribers when a post is published (Protected by Admin Key)
  router.post('/notify-published', async (req, res) => {
    try {
      const expectedAdminKey = process.env.ADMIN_KEY || 'admin123';
      const providedKey = req.headers['x-admin-key'] || req.query.adminKey || req.body?.adminKey;

      if (!providedKey || providedKey !== expectedAdminKey) {
        return res.status(403).json({
          error: 'Unauthorized: Invalid or missing Admin Key. Pass "x-admin-key" header.',
        });
      }

      const { slug, force } = req.body || {};

      // Identify post details
      const post = slug ? getPostDetailsBySlug(slug) : getLatestPostDetails();
      if (!post) {
        return res.status(404).json({
          error: slug
            ? `Post with slug "${slug}" not found in markdown posts.`
            : 'No markdown posts found to notify.',
        });
      }

      // Check if already notified
      let alreadyNotified = false;
      try {
        const check = await pool.query('SELECT * FROM sent_notifications WHERE post_slug = $1;', [post.slug]);
        if (check.rows && check.rows.length > 0) alreadyNotified = true;
      } catch {
        alreadyNotified = inMemorySentNotifications.some((n) => n.post_slug === post.slug);
      }

      if (alreadyNotified && !force) {
        return res.status(200).json({
          success: false,
          message: `Post "${post.title}" (${post.slug}) has already been notified to subscribers. Pass { force: true } to send again.`,
          post,
        });
      }

      // Fetch all active subscribers
      let activeSubscribers = [];
      try {
        const subResult = await pool.query(
          'SELECT email, unsubscribe_token FROM subscribers WHERE is_active = TRUE;'
        );
        activeSubscribers = subResult.rows;
      } catch {
        activeSubscribers = inMemorySubscribers.filter((s) => s.is_active);
      }

      if (activeSubscribers.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No active subscribers found to notify.',
          sentCount: 0,
          post,
        });
      }

      const siteUrl = getSiteUrl(req);
      const apiBase = getApiBaseUrl(req);
      const postUrl = `${siteUrl}/#post/${post.slug}`;

      // Dispatch emails
      let successCount = 0;
      let failureCount = 0;
      let dryRun = false;

      for (const subscriber of activeSubscribers) {
        try {
          const unsubscribeUrl = `${apiBase}/api/subscribers/unsubscribe?token=${subscriber.unsubscribe_token}`;
          const emailHtml = renderNewPostEmail({
            postTitle: post.title,
            postExcerpt: post.excerpt,
            readingTime: post.readingTime,
            postUrl,
            unsubscribeUrl,
            siteUrl,
          });

          const result = await sendEmail({
            to: subscriber.email,
            subject: `New Post: ${post.title}`,
            html: emailHtml,
          });

          if (result && result.dryRun) dryRun = true;
          successCount++;
        } catch (dispatchErr) {
          console.error(`[Subscribers] Failed to send notification to ${subscriber.email}:`, dispatchErr.message);
          failureCount++;
        }
      }

      // Record in sent_notifications
      try {
        await pool.query(
          'INSERT INTO sent_notifications (post_slug, recipient_count) VALUES ($1, $2);',
          [post.slug, successCount]
        );
      } catch {
        inMemorySentNotifications.push({
          id: Date.now(),
          post_slug: post.slug,
          recipient_count: successCount,
          sent_at: new Date().toISOString(),
        });
        saveSentNotificationsBackup();
      }

      return res.status(200).json({
        success: true,
        message: `Notification broadcast completed for "${post.title}".`,
        post: {
          title: post.title,
          slug: post.slug,
          readingTime: post.readingTime,
          url: postUrl,
        },
        sentCount: successCount,
        failureCount,
        dryRun,
      });
    } catch (err) {
      console.error('[Subscribers] Notification broadcast error:', err);
      res.status(500).json({ error: 'Failed to broadcast post notification' });
    }
  });

  // 5. Status / Diagnostic route
  router.get('/status', async (req, res) => {
    let pgConnected = false;
    let subscriberCount = 0;
    let sentCount = 0;
    try {
      const subResult = await pool.query('SELECT COUNT(*) as count FROM subscribers WHERE is_active = TRUE;');
      subscriberCount = parseInt(subResult.rows[0].count, 10);
      const sentResult = await pool.query('SELECT COUNT(*) as count FROM sent_notifications;');
      sentCount = parseInt(sentResult.rows[0].count, 10);
      pgConnected = true;
    } catch {
      pgConnected = false;
      subscriberCount = inMemorySubscribers.filter((s) => s.is_active).length;
      sentCount = inMemorySentNotifications.length;
    }

    res.json({
      service: 'Subscribers & Notification Service',
      storage: pgConnected ? 'PostgreSQL (Persistent)' : 'In-Memory / JSON File (Fallback)',
      isDatabaseConnected: pgConnected,
      activeSubscribers: subscriberCount,
      sentNotificationsCount: sentCount,
      emailProviderConfigured: !!process.env.RESEND_API_KEY ? 'Resend' : (process.env.SMTP_USER ? 'Nodemailer SMTP' : 'Mock / Dry-Run'),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};
