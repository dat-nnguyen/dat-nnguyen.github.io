const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const marked = require('marked');

const app = express();

app.use(cors());
app.use(express.json());

// Resolves backend data files — tries process.cwd() first (works in Vercel Lambda),
// then falls back to path relative to this file.
function resolvePath(...segments) {
  const fromCwd = path.join(process.cwd(), ...segments);
  if (fs.existsSync(fromCwd)) return fromCwd;

  const fromFile = path.join(__dirname, '..', ...segments);
  if (fs.existsSync(fromFile)) return fromFile;

  return fromCwd; // return best guess even if missing (will 404/500 gracefully)
}

function calculateReadingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

// ── /api/about ─────────────────────────────────────────────────────────────
app.get('/api/about', (req, res) => {
  try {
    const filePath = resolvePath('backend', 'content-service', 'markdown_content', 'about.md');
    if (!fs.existsSync(filePath)) {
      return res.json({ title: 'About Me', content: '<p>Bio content coming soon...</p>' });
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    res.json({ title: parsed.data.title || 'About Me', content: marked.parse(parsed.content) });
  } catch (err) {
    console.error('Error /api/about:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/posts ─────────────────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  try {
    const postsDir = resolvePath('backend', 'content-service', 'markdown_content', 'posts');
    const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : [];

    let posts = files
      .filter(f => f.endsWith('.md'))
      .map(file => {
        const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
        const parsed = matter(raw);
        return {
          title: parsed.data.title || file.replace('.md', ''),
          category: parsed.data.category || parsed.data.type || 'technical',
          slug: parsed.data.slug || file.replace('.md', ''),
          createdAt: parsed.data.lastUpdated || parsed.data.date || new Date().toISOString(),
          readingTime: calculateReadingTime(parsed.content),
          content: marked.parse(parsed.content),
        };
      });

    if (req.query.category) {
      posts = posts.filter(p => p.category.toLowerCase() === req.query.category.toLowerCase());
    }

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) posts = posts.slice(0, limit);
    }

    res.json(posts);
  } catch (err) {
    console.error('Error /api/posts:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/posts/:slug ────────────────────────────────────────────────────────
app.get('/api/posts/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const postsDir = resolvePath('backend', 'content-service', 'markdown_content', 'posts');
    const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
      const parsed = matter(raw);
      const itemSlug = parsed.data.slug || file.replace('.md', '');
      if (itemSlug === slug || file.replace('.md', '') === slug) {
        return res.json({
          title: parsed.data.title || slug,
          category: parsed.data.category || parsed.data.type || 'technical',
          slug: itemSlug,
          createdAt: parsed.data.lastUpdated || parsed.data.date || new Date().toISOString(),
          readingTime: calculateReadingTime(parsed.content),
          content: marked.parse(parsed.content),
        });
      }
    }

    res.status(404).json({ error: 'Post not found' });
  } catch (err) {
    console.error('Error /api/posts/:slug:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/projects ───────────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  try {
    const filePath = resolvePath('backend', 'content-service', 'projects.json');
    if (!fs.existsSync(filePath)) return res.json([]);

    let projects = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) projects = projects.slice(0, limit);
    }

    res.json(projects);
  } catch (err) {
    console.error('Error /api/projects:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/comments ────────────────────────────────────────────────────────────
app.get('/api/comments/like/:articleId', (req, res) => {
  res.json({ articleId: req.params.articleId, likes: 0 });
});

app.post('/api/comments/like/:articleId', (req, res) => {
  res.json({ articleId: req.params.articleId, likes: 1 });
});

app.get('/api/comments/views/:slug', (req, res) => {
  res.json({ slug: req.params.slug, views: 0 });
});

app.post('/api/comments/views/:slug', (req, res) => {
  res.json({ slug: req.params.slug, views: 1 });
});

app.get('/api/comments/:articleId', (req, res) => {
  res.json([]);
});

app.post('/api/comments', (req, res) => {
  const { articleId, authorName, authorEmail, content } = req.body || {};
  res.status(201).json({
    id: Date.now(),
    article_id: articleId || '',
    author_name: authorName || 'Anonymous',
    author_email: authorEmail || '',
    content: content || '',
    created_at: new Date().toISOString(),
  });
});

// ── Health / root ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api', (req, res) => {
  res.json({
    message: "🚀 Dat Nguyen's API",
    status: 'online',
    endpoints: ['/api/posts', '/api/about', '/api/projects', '/api/comments'],
  });
});

module.exports = app;
