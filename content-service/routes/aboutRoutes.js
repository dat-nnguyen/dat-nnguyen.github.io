const express = require('express');
const router = express.Router();
const About = require('../models/About'); // Bring in the Vault 1 schema

// ==========================================
// GET: Fetch the Bio for the Frontend
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Grab the first document in the collection
    const bioData = await About.findOne();

    // Fallback just in case the database is completely empty
    if (!bioData) {
      return res.json({
        content:
          'I am a software engineer passionate about building scalable, efficient systems. (Default Fallback)',
      });
    }

    res.json({ content: bioData.content });
  } catch (error) {
    console.error('Vault 1 Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==========================================
// POST: Update or Create the Bio (Seed)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content field is required' });
    }

    // Find the first document and update it, OR create it if it doesn't exist (upsert)
    const updatedBio = await About.findOneAndUpdate(
      {}, // Empty filter means "just grab the first one"
      { content: content },
      { new: true, upsert: true },
    );

    res.json(updatedBio);
  } catch (error) {
    console.error('Failed to save bio:', error);
    res.status(500).json({ error: 'Could not save to Vault 1' });
  }
});

module.exports = router;
