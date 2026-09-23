import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const cjsRequire = createRequire(import.meta.url);
const nodemailer = cjsRequire('nodemailer');

import {
  escapeHtml,
  renderNewPostEmail,
  renderWelcomeEmail,
  renderUnsubscribePage,
  sendEmail,
} from '../../backend/interaction-service/services/emailService.js';

describe('Email Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('escapeHtml helper', () => {
    it('should return empty string for null, undefined, or empty input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });

    it('should escape HTML entities properly', () => {
      const input = '<div class="alert" id=\'x\'>Fish & Chips > Apples</div>';
      const output = escapeHtml(input);
      expect(output).toContain('&lt;div');
      expect(output).toContain('&quot;alert&quot;');
      expect(output).toContain('&#039;x&#039;');
      expect(output).toContain('Fish &amp; Chips');
      expect(output).toContain('&gt;');
    });

    it('should handle numeric and boolean types safely', () => {
      expect(escapeHtml(12345)).toBe('12345');
      expect(escapeHtml(true)).toBe('true');
    });
  });

  describe('renderNewPostEmail', () => {
    it('should generate complete HTML email with escaped post details and URLs', () => {
      const html = renderNewPostEmail({
        postTitle: 'Rock & Roll: A Programmer\'s Guide',
        postExcerpt: 'Here is what happens when <script> runs...',
        readingTime: '5 min read',
        postUrl: 'https://dat-nnguyen.github.io/#post/rock-roll',
        unsubscribeUrl: 'https://dat-nnguyen.github.io/api/subscribers/unsubscribe?token=abc123',
        siteUrl: 'https://dat-nnguyen.github.io',
      });

      expect(html).toContain('Rock &amp; Roll: A Programmer&#039;s Guide');
      expect(html).toContain('5 min read');
      expect(html).toContain('https://dat-nnguyen.github.io/#post/rock-roll');
      expect(html).toContain('https://dat-nnguyen.github.io/api/subscribers/unsubscribe?token=abc123');
      expect(html).not.toContain('<script>');
    });

    it('should fallback readingTime to 2 min read if undefined', () => {
      const html = renderNewPostEmail({
        postTitle: 'Test Post',
        postExcerpt: 'Excerpt',
        postUrl: 'http://localhost',
        unsubscribeUrl: 'http://localhost/unsub',
        siteUrl: 'http://localhost',
      });
      expect(html).toContain('2 min read');
    });
  });

  describe('renderWelcomeEmail', () => {
    it('should render welcome email with site and unsubscribe URLs', () => {
      const html = renderWelcomeEmail({
        siteUrl: 'https://dat-nnguyen.github.io',
        unsubscribeUrl: 'https://dat-nnguyen.github.io/unsub',
      });

      expect(html).toContain("You're Subscribed! 🎉");
      expect(html).toContain('https://dat-nnguyen.github.io');
      expect(html).toContain('https://dat-nnguyen.github.io/unsub');
    });
  });

  describe('renderUnsubscribePage', () => {
    it('should render success page when success is true', () => {
      const html = renderUnsubscribePage({
        success: true,
        email: 'user@example.com',
        siteUrl: 'https://dat-nnguyen.github.io',
      });

      expect(html).toContain('Unsubscribed Successfully');
      expect(html).toContain('user@example.com');
      expect(html).toContain('https://dat-nnguyen.github.io');
    });

    it('should render expired/invalid page when success is false', () => {
      const html = renderUnsubscribePage({
        success: false,
        siteUrl: 'https://dat-nnguyen.github.io',
      });

      expect(html).toContain('Invalid or Expired Link');
      expect(html).toContain('https://dat-nnguyen.github.io');
    });
  });

  describe('sendEmail Provider Dispatching', () => {
    it('should use Mock/Dry-Run mode when no external credentials configured', async () => {
      const result = await sendEmail({
        to: 'reader@example.com',
        subject: 'Dry-run Test',
        html: '<p>Test</p>',
      });

      expect(result).toEqual({
        success: true,
        provider: 'mock',
        dryRun: true,
      });
    });

    it('should support array of recipient emails in Dry-Run mode', async () => {
      const result = await sendEmail({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Array recipients',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
    });

    it('should send via Resend REST API when RESEND_API_KEY is present', async () => {
      process.env.RESEND_API_KEY = 're_test_key_123';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email_resend_999' }),
      });
      global.fetch = mockFetch;

      const result = await sendEmail({
        to: 'subscriber@example.com',
        subject: 'New Post via Resend',
        html: '<p>Resend body</p>',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.resend.com/emails');
      expect(result).toEqual({
        success: true,
        provider: 'resend',
        id: 'email_resend_999',
      });
    });

    it('should throw an error when Resend API returns an error response', async () => {
      process.env.RESEND_API_KEY = 're_test_key_fail';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Rate limit exceeded on Resend' }),
      });
      global.fetch = mockFetch;

      await expect(
        sendEmail({
          to: 'subscriber@example.com',
          subject: 'Fail Post',
          html: '<p>Fail body</p>',
        })
      ).rejects.toThrow('Rate limit exceeded on Resend');
    });

    it('should attempt SMTP sending when SMTP_USER and SMTP_PASS are set', async () => {
      process.env.SMTP_USER = 'smtp_user';
      process.env.SMTP_PASS = 'smtp_pass';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';

      const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'smtp_12345' });
      const spy = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: sendMailMock,
      });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'SMTP test',
        html: '<p>smtp</p>',
      });
      expect(result).toEqual({
        success: true,
        provider: 'nodemailer',
        messageId: 'smtp_12345',
      });
      expect(spy).toHaveBeenCalled();
    });

    it('should throw an error when Nodemailer sendMail fails', async () => {
      process.env.SMTP_USER = 'smtp_user';
      process.env.SMTP_PASS = 'smtp_pass';

      vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error('SMTP Auth Failure')),
      });

      await expect(
        sendEmail({
          to: 'user@example.com',
          subject: 'SMTP fail',
          html: '<p>smtp</p>',
        })
      ).rejects.toThrow('SMTP Auth Failure');
    });

    it('should cover all ternary fallbacks (RESEND_FROM, error messages, default host/port)', async () => {
      // 1. renderUnsubscribePage with missing email
      const unsubHtml = renderUnsubscribePage({ success: true, email: null });
      expect(unsubHtml).toContain('Your email');

      // 2. RESEND_FROM environment variable & error object without message
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.RESEND_FROM = 'blog@resend.dev';

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Resend generic error' }),
      });

      await expect(
        sendEmail({
          to: ['array-user@example.com'],
          subject: 'Array recipient test',
          html: '<p>array</p>',
        })
      ).rejects.toThrow('Resend generic error');

      // Resend error without message or error property
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      });
      await expect(
        sendEmail({
          to: 'single-user@example.com',
          subject: 'Fallback error test',
          html: '<p>err</p>',
        })
      ).rejects.toThrow('Failed to send email via Resend');

      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_FROM;

      // 3. SMTP defaults: default host (smtp.gmail.com), port 587, secure false, array of recipients
      process.env.SMTP_USER = 'smtp_user';
      process.env.SMTP_PASS = 'smtp_pass';

      const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'smtp_arr_123' });
      const spy = vi.spyOn(nodemailer, 'createTransport').mockImplementation((config) => {
        expect(config.host).toBe('smtp.gmail.com');
        expect(config.port).toBe(587);
        expect(config.secure).toBe(false);
        return { sendMail: sendMailMock };
      });

      const smtpRes = await sendEmail({
        to: ['sub1@example.com', 'sub2@example.com'],
        subject: 'Array SMTP',
        html: '<p>smtp array</p>',
      });
      expect(smtpRes.success).toBe(true);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sub1@example.com, sub2@example.com',
        })
      );

      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      // 4. Dry-run mode with null HTML and string recipient
      const dryRes = await sendEmail({
        to: 'single@example.com',
        subject: 'Null html dry run',
        html: null,
      });
      expect(dryRes.dryRun).toBe(true);

      global.fetch = originalFetch;
    });
  });
});

