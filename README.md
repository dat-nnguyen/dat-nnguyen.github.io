# Personal Portfolio Website

A personal portfolio and blog with a static frontend deployed to **GitHub Pages** and a containerized Node.js API Gateway backend deployed to **Railway**.

## Architecture

- **Frontend**: Vanilla JS + CSS built with Vite, hosted on **GitHub Pages**.
- **Backend API Gateway**: Express.js service providing `/api/posts`, `/api/about`, `/api/projects`, and `/api/comments`, hosted on **Railway**.
- **Database (Optional)**: PostgreSQL (provisioned via Railway PostgreSQL plugin) with auto-migrated tables, falling back gracefully to in-memory store if not configured.

---

## Local Development

1. **Install root dependencies**:
   ```bash
   npm install
   ```

2. **Start the backend**:
   ```bash
   npm start
   ```
   Runs the API Gateway on `http://localhost:5050`.

3. **Start the frontend dev server**:
   ```bash
   npm run dev
   ```
   Runs Vite dev server with proxy to `http://localhost:5050`.

---

## Deploying Backend to Railway

1. Go to [Railway](https://railway.app) and create a **New Project**.
2. Select **Deploy from GitHub repo** and pick this repository.
3. Railway automatically detects `railway.json` and runs `npm start`.
4. *(Optional Database)* Click **+ New** > **Database** > **Add PostgreSQL**. Railway will automatically link `DATABASE_URL` to your backend service.
5. In your Railway service settings under **Networking**, click **Generate Domain** (e.g. `https://personal-website-production.up.railway.app`).
6. Copy your public domain and configure it for the frontend:
   - In GitHub repository settings: **Settings** > **Secrets and variables** > **Actions** > add `VITE_API_BASE_URL` with your Railway URL.
   - Or update `.env.production` before building.
