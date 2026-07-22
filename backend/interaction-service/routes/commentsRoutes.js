const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

module.exports = (pool) => {
    // POST method to create new comment
    router.post('/', async (req, res) => {
        const { articleId, authorName, authorEmail, content } = req.body;

        // validation check
        if (!articleId || !authorName || !authorEmail || !content) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const insertQuery = `
            INSERT INTO comments (article_id, author_name, author_email, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *; 
        `;

        try {
            const result = await pool.query(insertQuery, [articleId, authorName, authorEmail, content]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create comment' });
        }
    });

    router.get('/:articleId', async (req, res) => {
        const { articleId } = req.params;

        const selectQuery = `
            SELECT * FROM comments 
             WHERE article_id = $1
            ORDER BY created_at DESC;
            `;

        try {
            const result = await pool.query(selectQuery, [articleId]);

            res.status(200).json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch comments' });
        }
    });
    return router;
}