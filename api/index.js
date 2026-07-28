const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const marked = require('marked');

const app = express();

app.use(cors());
app.use(express.json());

function resolvePath(...segments) {
  const primary = path.join(process.cwd(), ...segments);
  if (fs.existsSync(primary)) return primary;

  const secondary = path.join(__dirname, '..', ...segments);
  if (fs.existsSync(secondary)) return secondary;

  return primary;
}

function calculateReadingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

app.get(['/api/about', '/about'], (req, res) => {
  try {
    const filePath = resolvePath('backend', 'content-service', 'markdown_content', 'about.md');
    if (!fs.existsSync(filePath)) {
      return res.json({ title: 'About Me', content: '<p>Bio content coming soon...</p>' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const htmlContent = marked.parse(parsed.content);

    res.json({
      title: parsed.data.title || 'About Me',
      content: htmlContent,
    });
  } catch (err) {
    console.error('Error fetching about content:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.get(['/api/posts', '/posts'], (req, res) => {
  try {
    const postsDir = resolvePath('backend', 'content-service', 'markdown_content', 'posts');
    let files = [];
    if (fs.existsSync(postsDir)) {
      files = fs.readdirSync(postsDir);
    }

    const posts = [];
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(postsDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = matter(raw);

        posts.push({
          title: parsed.data.title || file.replace('.md', ''),
          category: parsed.data.category || parsed.data.type || 'technical',
          slug: parsed.data.slug || file.replace('.md', ''),
          createdAt: parsed.data.lastUpdated || parsed.data.date || new Date().toISOString(),
          readingTime: calculateReadingTime(parsed.content),
          content: marked.parse(parsed.content),
        });
      }
    }

    let result = posts;
    if (req.query.category) {
      result = result.filter(
        (p) => p.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) {
        result = result.slice(0, limit);
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.get(['/api/posts/:slug', '/posts/:slug'], (req, res) => {
  try {
    const { slug } = req.params;
    const postsDir = resolvePath('backend', 'content-service', 'markdown_content', 'posts');
    let files = [];
    if (fs.existsSync(postsDir)) {
      files = fs.readdirSync(postsDir);
    }

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(postsDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
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
    }

    res.status(404).json({ error: 'Post not found' });
  } catch (err) {
    console.error('Error fetching single post:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.get(['/api/projects', '/projects'], (req, res) => {
  try {
    const filePath = resolvePath('backend', 'content-service', 'projects.json');
    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    let projects = JSON.parse(raw);

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) {
        projects = projects.slice(0, limit);
      }
    }

    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.get(['/api/comments/like/:articleId', '/comments/like/:articleId'], (req, res) => {
  res.json({ articleId: req.params.articleId, likes: 0 });
});

app.post(['/api/comments/like/:articleId', '/comments/like/:articleId'], (req, res) => {
  res.json({ articleId: req.params.articleId, likes: 1 });
});

app.get(['/api/comments/:articleId', '/comments/:articleId'], (req, res) => {
  res.json([]);
});

app.post(['/api/comments', '/comments'], (req, res) => {
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

app.get(['/api', '/'], (req, res) => {
  res.json({
    message: "🚀 Dat Nguyen's Personal Website API (Vercel Serverless)",
    status: 'online',
    endpoints: ['/api/posts', '/api/about', '/api/projects', '/api/comments'],
  });
});

app.get(['/api/health', '/health'], (req, res) => res.json({ status: 'ok', service: 'API Gateway (Serverless)' }));

module.exports = app;
