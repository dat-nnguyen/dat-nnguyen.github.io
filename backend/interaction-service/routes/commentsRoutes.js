const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const commentsJsonPath = path.join(__dirname, '../comments.json');

async function getFallbackComments() {
  try {
    const data = await fs.readFile(commentsJsonPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveFallbackComments(comments) {
  await fs.writeFile(commentsJsonPath, JSON.stringify(comments, null, 2), 'utf-8');
}

const likesJsonPath = path.join(__dirname, '../likes.json');

async function getLikes() {
  try {
    const data = await fs.readFile(likesJsonPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveLikes(likes) {
  await fs.writeFile(likesJsonPath, JSON.stringify(likes, null, 2), 'utf-8');
}

module.exports = (pool) => {
  // GET likes for article
  router.get('/like/:articleId', async (req, res) => {
    const { articleId } = req.params;
    const likesMap = await getLikes();
    const count = likesMap[articleId] || 0;
    res.json({ articleId, likes: count });
  });

  // POST increment or decrement like for article
  router.post('/like/:articleId', async (req, res) => {
    const { articleId } = req.params;
    const { action } = req.body || {};
    const likesMap = await getLikes();
    const current = likesMap[articleId] || 0;

    if (action === 'unlike') {
      likesMap[articleId] = Math.max(0, current - 1);
    } else {
      likesMap[articleId] = current + 1;
    }

    await saveLikes(likesMap);
    res.json({ articleId, likes: likesMap[articleId] });
  });


  // POST method to create new comment
  router.post('/', async (req, res) => {
    const { articleId, authorName, authorEmail, content } = req.body;

    if (!articleId || !authorName || !authorEmail || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

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
      console.warn('PostgreSQL query failed, using local JSON fallback:', dbErr.message);

      const comments = await getFallbackComments();
      const newComment = {
        id: Date.now(),
        article_id: articleId,
        author_name: authorName,
        author_email: authorEmail,
        content: content,
        created_at: new Date().toISOString(),
      };
      comments.unshift(newComment);
      await saveFallbackComments(comments);

      return res.status(201).json(newComment);
    }
  });

  // GET method to fetch comments for a post
  router.get('/:articleId', async (req, res) => {
    const { articleId } = req.params;

    try {
      const selectQuery = `
        SELECT * FROM comments 
        WHERE article_id = $1
        ORDER BY created_at DESC;
      `;
      const result = await pool.query(selectQuery, [articleId]);
      return res.status(200).json(result.rows);
    } catch (dbErr) {
      console.warn('PostgreSQL query failed, using local JSON fallback:', dbErr.message);

      const comments = await getFallbackComments();
      const filtered = comments.filter((c) => c.article_id === articleId);
      return res.status(200).json(filtered);
    }
  });

  return router;
};