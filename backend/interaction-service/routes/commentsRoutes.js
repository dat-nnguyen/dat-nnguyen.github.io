const express = require('express');
const router = express.Router();

// Pure in-memory storage (ephemeral — resets on each deploy/restart)
let inMemoryComments = [];
let inMemoryLikes = {};

module.exports = (pool) => {
  // GET likes for article
  router.get('/like/:articleId', async (req, res) => {
    try {
      const { articleId } = req.params;
      const count = inMemoryLikes[articleId] || 0;
      res.json({ articleId, likes: count });
    } catch (err) {
      console.error('GET /like error:', err);
      res.status(500).json({ error: 'Failed to fetch likes' });
    }
  });

  // POST increment or decrement like for article
  router.post('/like/:articleId', async (req, res) => {
    try {
      const { articleId } = req.params;
      const { action } = req.body || {};
      const current = inMemoryLikes[articleId] || 0;

      if (action === 'unlike') {
        inMemoryLikes[articleId] = Math.max(0, current - 1);
      } else {
        inMemoryLikes[articleId] = current + 1;
      }

      res.json({ articleId, likes: inMemoryLikes[articleId] });
    } catch (err) {
      console.error('POST /like error:', err);
      res.status(500).json({ error: 'Failed to update like' });
    }
  });

  // POST method to create new comment
  router.post('/', async (req, res) => {
    try {
      const { articleId, authorName, authorEmail, content } = req.body;

      if (!articleId || !authorName || !authorEmail || !content) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Try PostgreSQL first
      try {
        const insertQuery = `
          INSERT INTO comments (article_id, author_name, author_email, content)
          VALUES ($1, $2, $3, $4)
          RETURNING *; 
        `;
        const result = await pool.query(insertQuery, [articleId, authorName, authorEmail, content]);
        const row = result.rows[0];
        return res.status(201).json({
          id: row.id,
          article_id: row.article_id,
          author_name: row.author_name,
          author_email: row.author_email,
          content: row.content,
          created_at: row.created_at,
        });
      } catch (dbErr) {
        console.warn('PostgreSQL unavailable, using in-memory:', dbErr.message);
      }

      // In-memory fallback
      const newComment = {
        id: Date.now(),
        article_id: articleId,
        author_name: authorName,
        author_email: authorEmail,
        content: content,
        created_at: new Date().toISOString(),
      };
      inMemoryComments.unshift(newComment);
      return res.status(201).json(newComment);
    } catch (err) {
      console.error('POST / comment error:', err);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // GET method to fetch comments for a post
  router.get('/:articleId', async (req, res) => {
    try {
      const { articleId } = req.params;

      // Try PostgreSQL first
      try {
        const selectQuery = `
          SELECT * FROM comments 
          WHERE article_id = $1
          ORDER BY created_at DESC;
        `;
        const result = await pool.query(selectQuery, [articleId]);
        return res.status(200).json(result.rows);
      } catch (dbErr) {
        console.warn('PostgreSQL unavailable, using in-memory:', dbErr.message);
      }

      // In-memory fallback
      const filtered = inMemoryComments.filter((c) => c.article_id === articleId);
      return res.status(200).json(filtered);
    } catch (err) {
      console.error('GET /:articleId comments error:', err);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  return router;
};