const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const matter = require('gray-matter');
const marked = require('marked');

async function getPostsDir() {
  const candidates = [
    path.join(__dirname, '../markdown_content/posts'),
    path.join(__dirname, '../../content-service/markdown_content/posts'),
    path.join(process.cwd(), 'backend/content-service/markdown_content/posts'),
    path.join(process.cwd(), 'content-service/markdown_content/posts'),
    path.join(process.cwd(), 'markdown_content/posts'),
  ];
  for (const dir of candidates) {
    try {
      await fs.access(dir);
      return dir;
    } catch {}
  }
  return candidates[0];
}

function calculateReadingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

// GET /api/posts -> Fetch all posts, optionally filtered by category
router.get('/', async (req, res) => {
  try {
    const postsDir = await getPostsDir();
    let files = [];
    try {
      files = await fs.readdir(postsDir);
    } catch {
      files = [];
    }

    const posts = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(postsDir, file);
        const rawContent = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(rawContent);

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
        (p) => p.category.toLowerCase() === req.query.category.toLowerCase(),
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) {
        result = result.slice(0, limit);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// GET /api/posts/:slug -> Fetch single post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const postsDir = await getPostsDir();
    let files = [];
    try {
      files = await fs.readdir(postsDir);
    } catch {
      files = [];
    }

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(postsDir, file);
        const rawContent = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(rawContent);
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
  } catch (error) {
    console.error('Failed to fetch post by slug:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;


