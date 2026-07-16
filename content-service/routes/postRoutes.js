const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// GET /api/posts -> Fetch all posts, optionally filtered by category
router.get('/', async (req, res) => {
  try {
    let query = {};

    // If the frontend asks for a specific category, filter the database!
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Fetch posts, sort by newest first, and limit to 5 per section
    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(5);

    res.json(posts);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// We will also add a quick POST route so you can easily seed test data from Postman/WebStorm
router.post('/', async (req, res) => {
  try {
    const newPost = new Post(req.body);
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
