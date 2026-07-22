const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const matter = require('gray-matter');
const marked = require('marked');

const postsDir = path.join(__dirname, '../markdown_content/posts');

// GET /api/posts -> Fetch all posts, optionally filtered by category
router.get('/', async (req, res) => {
  try {
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

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

