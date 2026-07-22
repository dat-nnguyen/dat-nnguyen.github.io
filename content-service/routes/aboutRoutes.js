const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const matter = require('gray-matter');
const marked = require('marked');

let cachedBio = null;

// ==========================================
// GET: Fetch the Bio from Markdown with RAM Caching
// ==========================================
router.get('/', async (req, res) => {
  try {
    if (cachedBio !== null) {
      console.log('Serving from cache(RAM)');
      return res.json(cachedBio);
    }

    console.log('Reading from Hard Drive...');
    const filePath = path.join(__dirname, '../markdown_content.md/about.md');
    const rawMarkdown = await fs.readFile(filePath, 'utf-8');
    const parsedFile = matter(rawMarkdown);
    const htmlContent = marked.parse(parsedFile.content);

    const responseData = {
      title: parsedFile.data.title || 'About Me',
      content: htmlContent,
    };

    cachedBio = responseData;
    res.json(responseData);
  } catch (error) {
    console.error('Failed to read Markdown file:', error);

    // Fallback response if the file is missing or broken
    res.status(500).json({
      title: 'About Me',
      content: '<p>Bio is currently being updated...</p>',
    });
  }
});

// ==========================================
// POST: Update or Create the Bio
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content field is required' });
    }

    // Invalidate cache on update
    cachedBio = null;

    res.json({ message: 'Bio updated' });
  } catch (error) {
    console.error('Failed to save bio:', error);
    res.status(500).json({ error: 'Could not save bio' });
  }
});

module.exports = router;

