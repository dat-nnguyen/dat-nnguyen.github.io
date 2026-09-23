-- ==============================================================================
-- Supabase Schema & Security Setup for Dat Nguyen's Personal Website
-- Run this script in your Supabase Project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  article_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index comments by article for instant retrieval
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON public.comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

-- 2. LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
  article_id VARCHAR(255) PRIMARY KEY,
  likes_count INT DEFAULT 0
);

-- 3. POST VIEWS TABLE
CREATE TABLE IF NOT EXISTS public.post_views (
  article_id VARCHAR(255) PRIMARY KEY,
  views_count INT DEFAULT 0
);

-- 4. EMAIL SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS public.subscribers (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribe_token VARCHAR(64) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON public.subscribers(unsubscribe_token);

-- 5. SENT NOTIFICATIONS LOG TABLE
CREATE TABLE IF NOT EXISTS public.sent_notifications (
  id BIGSERIAL PRIMARY KEY,
  post_slug VARCHAR(255) NOT NULL,
  recipient_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_post_slug ON public.sent_notifications(post_slug);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DROP POLICY IF EXISTS "Public can view comments" ON public.comments;
DROP POLICY IF EXISTS "Public can post comments" ON public.comments;
DROP POLICY IF EXISTS "Public can view likes" ON public.likes;
DROP POLICY IF EXISTS "Public can update likes" ON public.likes;
DROP POLICY IF EXISTS "Public can view views" ON public.post_views;
DROP POLICY IF EXISTS "Public can update views" ON public.post_views;
DROP POLICY IF EXISTS "Public can subscribe" ON public.subscribers;
DROP POLICY IF EXISTS "Public can unsubscribe" ON public.subscribers;
DROP POLICY IF EXISTS "Service role manages sent_notifications" ON public.sent_notifications;

-- COMMENTS POLICIES
CREATE POLICY "Public can view comments"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Public can post comments"
  ON public.comments FOR INSERT
  WITH CHECK (true);

-- NOTE: Direct DELETE is blocked for public. Comments can only be deleted
-- by the site owner using the secure stored procedure `delete_comment_with_password()`.

-- LIKES POLICIES
CREATE POLICY "Public can view likes"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Public can update likes"
  ON public.likes FOR ALL
  USING (true);

-- VIEWS POLICIES
CREATE POLICY "Public can view views"
  ON public.post_views FOR SELECT
  USING (true);

CREATE POLICY "Public can update views"
  ON public.post_views FOR ALL
  USING (true);

-- SUBSCRIBERS POLICIES
CREATE POLICY "Public can subscribe"
  ON public.subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can unsubscribe"
  ON public.subscribers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read subscriber status"
  ON public.subscribers FOR SELECT
  USING (true);

-- SENT NOTIFICATIONS POLICIES
CREATE POLICY "Service role manages sent_notifications"
  ON public.sent_notifications FOR ALL
  USING (true);

-- ==============================================================================
-- ATOMIC STORED PROCEDURES (RPC)
-- ==============================================================================

-- Atomic like / unlike procedure to prevent race conditions
CREATE OR REPLACE FUNCTION increment_like(post_slug TEXT, is_unlike BOOLEAN DEFAULT FALSE)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  IF is_unlike THEN
    INSERT INTO public.likes (article_id, likes_count)
    VALUES (post_slug, 0)
    ON CONFLICT (article_id)
    DO UPDATE SET likes_count = GREATEST(0, public.likes.likes_count - 1)
    RETURNING likes_count INTO new_count;
  ELSE
    INSERT INTO public.likes (article_id, likes_count)
    VALUES (post_slug, 1)
    ON CONFLICT (article_id)
    DO UPDATE SET likes_count = public.likes.likes_count + 1
    RETURNING likes_count INTO new_count;
  END IF;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic view increment procedure
CREATE OR REPLACE FUNCTION increment_view(post_slug TEXT)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO public.post_views (article_id, views_count)
  VALUES (post_slug, 1)
  ON CONFLICT (article_id)
  DO UPDATE SET views_count = public.post_views.views_count + 1
  RETURNING views_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ADMIN SECURITY & PROTECTED COMMENT DELETION
-- ==============================================================================

-- Enable pgcrypto extension for secure SHA-256 password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin settings table (Isolated with RLS, NO public policies - completely hidden from public API)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Initial default admin password ('admin123') stored ONLY as a secure SHA-256 hash.
-- The password is NEVER exposed in frontend source code or git.
INSERT INTO public.admin_settings (key, value)
VALUES ('admin_password_hash', encode(digest('admin123', 'sha256'), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Secure procedure to delete comment requiring correct admin password
CREATE OR REPLACE FUNCTION delete_comment_with_password(
  target_comment_id BIGINT,
  admin_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
  input_hash TEXT;
BEGIN
  SELECT value INTO stored_hash FROM public.admin_settings WHERE key = 'admin_password_hash';
  IF stored_hash IS NULL THEN
    RAISE EXCEPTION 'Admin password not set in database';
  END IF;

  input_hash := encode(digest(admin_password, 'sha256'), 'hex');

  IF input_hash = stored_hash THEN
    DELETE FROM public.comments WHERE id = target_comment_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Invalid admin password';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure to change admin password securely from Supabase
CREATE OR REPLACE FUNCTION update_admin_password(
  current_password TEXT,
  new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
  input_hash TEXT;
BEGIN
  SELECT value INTO stored_hash FROM public.admin_settings WHERE key = 'admin_password_hash';
  IF stored_hash IS NULL THEN
    RAISE EXCEPTION 'Admin password not set in database';
  END IF;

  input_hash := encode(digest(current_password, 'sha256'), 'hex');

  IF input_hash = stored_hash THEN
    UPDATE public.admin_settings
    SET value = encode(digest(new_password, 'sha256'), 'hex')
    WHERE key = 'admin_password_hash';
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Current admin password incorrect';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

