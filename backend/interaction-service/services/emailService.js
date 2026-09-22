const crypto = require('crypto');

/**
 * Clean, minimalist HTML email templates tailored for Dat Nguyen's portfolio aesthetic.
 */
function renderNewPostEmail({ postTitle, postExcerpt, readingTime, postUrl, unsubscribeUrl, siteUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(postTitle)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #111317;
      color: #cbd5e1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #111317;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #181b20;
      border: 1px solid #262a35;
      border-radius: 8px;
      padding: 36px 32px;
    }
    .header {
      border-bottom: 1px solid #262a35;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .author-name {
      font-size: 15px;
      font-weight: 700;
      color: #60a5fa;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #93c5fd;
      background-color: #162335;
      border: 1px solid #1e3552;
      border-radius: 4px;
      padding: 3px 8px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.35;
      margin: 0 0 12px 0;
    }
    .meta {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 20px;
    }
    .excerpt {
      font-size: 15px;
      color: #cbd5e1;
      line-height: 1.7;
      margin-bottom: 32px;
    }
    .cta-btn {
      display: inline-block;
      background-color: #60a5fa;
      color: #0f172a !important;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }
    .footer {
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid #262a35;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #94a3b8;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="${siteUrl}" class="author-name">Dat Nguyen</a>
      </div>
      <div>
        <span class="badge">New Post</span>
        <h1>${escapeHtml(postTitle)}</h1>
        <div class="meta">
          <span>⏱️ ${escapeHtml(readingTime || '2 min read')}</span>
        </div>
        <p class="excerpt">${escapeHtml(postExcerpt)}</p>
        <a href="${postUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">Read Article &rarr;</a>
      </div>
      <div class="footer">
        <p>You received this email because you subscribed to new post alerts on <a href="${siteUrl}">dat-nnguyen.github.io</a>.</p>
        <p><a href="${unsubscribeUrl}">Unsubscribe</a> anytime with a single click.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderWelcomeEmail({ siteUrl, unsubscribeUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Subscribed to Dat Nguyen's Blog</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #111317;
      color: #cbd5e1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .wrapper {
      padding: 40px 20px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #181b20;
      border: 1px solid #262a35;
      border-radius: 8px;
      padding: 36px 32px;
    }
    h1 {
      color: #f8fafc;
      font-size: 22px;
      margin-top: 0;
    }
    p {
      line-height: 1.6;
      color: #cbd5e1;
    }
    .cta-btn {
      display: inline-block;
      margin-top: 16px;
      background-color: #60a5fa;
      color: #0f172a !important;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 6px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #262a35;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h1>You're Subscribed! 🎉</h1>
      <p>Hey there,</p>
      <p>Thanks for subscribing to my blog. Whenever I publish a new article or technical breakdown, you'll receive a short notification right in your inbox.</p>
      <p>No spam, ever. Just straight-to-the-point engineering and thoughts.</p>
      <a href="${siteUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">Visit Website</a>
      <div class="footer">
        <p>If this was a mistake, you can <a href="${unsubscribeUrl}">unsubscribe here</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderUnsubscribePage({ success, email, siteUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — Dat Nguyen</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #111317;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
      padding: 20px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background-color: #181b20;
      border: 1px solid #262a35;
      border-radius: 8px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    h1 {
      font-size: 22px;
      margin: 0 0 12px 0;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background-color: #60a5fa;
      color: #0f172a;
      text-decoration: none;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    ${
      success
        ? `<h1>Unsubscribed Successfully</h1>
           <p><strong>${escapeHtml(email || 'Your email')}</strong> has been removed from blog notification alerts. You won't receive any more emails.</p>`
        : `<h1>Invalid or Expired Link</h1>
           <p>We could not find an active subscription associated with this link.</p>`
    }
    <a href="${siteUrl}" class="btn">&larr; Back to Dat's Portfolio</a>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Dispatch an email through Resend API, Nodemailer SMTP, or Mock Dry-Run mode.
 */
async function sendEmail({ to, subject, html }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Dat Nguyen <onboarding@resend.dev>';

  // 1. If Resend API Key is provided -> Send via Resend REST API
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send email via Resend');
      }
      return { success: true, provider: 'resend', id: data.id };
    } catch (err) {
      console.error('[EmailService] Resend error:', err.message);
      throw err;
    }
  }

  // 2. If SMTP environment variables are set -> Try Nodemailer if available
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      let nodemailer;
      try {
        nodemailer = require('nodemailer');
      } catch {
        console.warn('[EmailService] nodemailer package not installed, falling back to mock mode.');
      }

      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const info = await transporter.sendMail({
          from: fromEmail,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html,
        });
        return { success: true, provider: 'nodemailer', messageId: info.messageId };
      }
    } catch (err) {
      console.error('[EmailService] Nodemailer error:', err.message);
      throw err;
    }
  }

  // 3. Fallback: Dry-Run / Console Preview Mode (great for local development & initial setup)
  console.log('----------------------------------------------------');
  console.log(`[EmailService] 📢 DRY RUN / MOCK EMAIL (No RESEND_API_KEY or SMTP configured)`);
  console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${fromEmail}`);
  console.log('HTML Preview Length:', html ? html.length : 0, 'bytes');
  console.log('----------------------------------------------------');

  return { success: true, provider: 'mock', dryRun: true };
}

module.exports = {
  sendEmail,
  renderNewPostEmail,
  renderWelcomeEmail,
  renderUnsubscribePage,
};
