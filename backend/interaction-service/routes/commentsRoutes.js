const express = require('express');
const router = express.Router();

// Pure in-memory storage (ephemeral — fallback when PostgreSQL is not connected)
let inMemoryComments = [];
let inMemoryLikes = {};

module.exports = (pool) => {
  // GET storage status (to help verify whether data is saved in PostgreSQL or In-Memory)
  router.get('/storage/status', async (req, res) => {
    let pgConnected = false;
    let commentCount = 0;
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM comments;');
      commentCount = parseInt(result.rows[0].count, 10);
      pgConnected = true;
    } catch (err) {
      pgConnected = false;
      commentCount = inMemoryComments.length;
    }

    res.json({
      storage: pgConnected ? 'PostgreSQL (Persistent)' : 'In-Memory (Ephemeral)',
      isDatabaseConnected: pgConnected,
      totalComments: commentCount,
      timestamp: new Date().toISOString(),
    });
  });

  // GET likes for article
  router.get('/like/:articleId', async (req, res) => {
    const { articleId } = req.params;
    try {
      // Try PostgreSQL first
      try {
        const result = await pool.query('SELECT likes_count FROM likes WHERE article_id = $1;', [articleId]);
        if (result.rows && result.rows.length > 0) {
          return res.json({ articleId, likes: result.rows[0].likes_count });
        }
        return res.json({ articleId, likes: 0 });
      } catch (dbErr) {
        // Fallback to in-memory
      }

      const count = inMemoryLikes[articleId] || 0;
      res.json({ articleId, likes: count });
    } catch (err) {
      console.error('GET /like error:', err);
      res.status(500).json({ error: 'Failed to fetch likes' });
    }
  });

  // POST increment or decrement like for article
  router.post('/like/:articleId', async (req, res) => {
    const { articleId } = req.params;
    const { action } = req.body || {};

    try {
      // Try PostgreSQL first
      try {
        if (action === 'unlike') {
          const result = await pool.query(
            `INSERT INTO likes (article_id, likes_count)
             VALUES ($1, 0)
             ON CONFLICT (article_id)
             DO UPDATE SET likes_count = GREATEST(0, likes.likes_count - 1)
             RETURNING likes_count;`,
            [articleId]
          );
          return res.json({ articleId, likes: result.rows[0].likes_count });
        } else {
          const result = await pool.query(
            `INSERT INTO likes (article_id, likes_count)
             VALUES ($1, 1)
             ON CONFLICT (article_id)
             DO UPDATE SET likes_count = likes.likes_count + 1
             RETURNING likes_count;`,
            [articleId]
          );
          return res.json({ articleId, likes: result.rows[0].likes_count });
        }
      } catch (dbErr) {
        // Fallback to in-memory
      }

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

  // DELETE comment by ID (protected by Admin Key)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const expectedAdminKey = process.env.ADMIN_KEY || 'admin123';
      const providedKey = req.headers['x-admin-key'] || req.query.adminKey || req.body?.adminKey;

      if (!providedKey || providedKey !== expectedAdminKey) {
        return res.status(403).json({
          error: 'Unauthorized: Invalid or missing Admin Key. Only the site administrator can delete comments.',
        });
      }

      // Try PostgreSQL first
      try {
        const deleteQuery = `
          DELETE FROM comments 
          WHERE id = $1
          RETURNING *;
        `;
        const result = await pool.query(deleteQuery, [id]);
        if (result.rows && result.rows.length > 0) {
          return res.status(200).json({
            message: 'Comment deleted successfully',
            deletedComment: result.rows[0],
          });
        }
      } catch (dbErr) {
        console.warn('PostgreSQL unavailable for delete, checking in-memory:', dbErr.message);
      }

      // In-memory fallback
      const initialLength = inMemoryComments.length;
      inMemoryComments = inMemoryComments.filter((c) => String(c.id) !== String(id));
      if (inMemoryComments.length < initialLength) {
        return res.status(200).json({
          message: 'Comment deleted successfully (in-memory)',
          id,
        });
      }

      return res.status(404).json({ error: 'Comment not found' });
    } catch (err) {
      console.error('DELETE /:id comment error:', err);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  return router;
};