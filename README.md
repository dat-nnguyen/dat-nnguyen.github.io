# Personal Portfolio Website

A personal portfolio and blog with a static frontend deployed to **GitHub Pages** and a serverless database backend powered by **Supabase**.

## Architecture

- **Frontend**: Vanilla JS + CSS built with Vite, hosted globally on **GitHub Pages**. Pre-renders all markdown blog posts, projects, and bio content to static JSON.
- **Database & Realtime (Serverless)**: **Supabase** (PostgreSQL) handling:
  - Article likes & atomic view counters
  - Reader comments with moderation
  - Email subscribers
- **Automated Publishing & Notifications**: GitHub Actions workflow automatically rebuilds the site on push to `main` and broadcasts emails to subscribers via Resend / Supabase.
- **Offline / Local Fallback**: Client-side `localStorage` cache ensures likes and comments work instantly even when offline.

---

## Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the frontend dev server**:

   ```bash
   npm run dev
   ```

   Runs Vite dev server on `http://localhost:5173`.

---

## Setting Up Supabase (100% Free & Serverless)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase project dashboard.
3. Open and run the migration script: [`supabase/schema.sql`](supabase/schema.sql).
4. Retrieve your **Project URL** and **Anon Key** from:
   **Project Settings** > **API**.
5. Add the secrets to your GitHub repository:
   - In GitHub > **Settings** > **Secrets and variables** > **Actions**:
     - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://your-project.supabase.co`)
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase public `anon` key
     - `RESEND_API_KEY`: *(Optional)* Your Resend API key for subscriber emails
6. Done! No server containers, no sleeping dynos, zero hosting costs.
