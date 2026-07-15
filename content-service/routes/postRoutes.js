const express = require('express');
const router = express.Router();
const Article = require('../models/Post');

// POST method to create a new article
router.post('/', async (req, res) => {
  try {
    const newArticle = new Article(req.body); // containing JSON data send from front-end (user request)

    const savedArticle = await newArticle.save(); // save article to mongo

    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(400).json({ message: "Failed to save article", error: err.message });
  }
});

// GET method to retrieve all articles
router.get('/', async (req, res) => {
 try {
   const articles = await Article.find().sort({ createdAt: -1 });
   res.status(200).json(articles);
 } catch (error) {
   res.status(500).json({ message: "Failed to retrieve articles"});
 }
});

// GET slug (URL) method for fetching a single article
router.get('/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug});

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json(article);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve article" });
  }
});

module.exports = router;