const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const projectsFilePath = path.join(__dirname, '../projects.json');

// GET /api/projects -> Fetch all projects
router.get('/', async (req, res) => {
  try {
    const rawData = await fs.readFile(projectsFilePath, 'utf-8');
    let projects = JSON.parse(rawData);

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) {
        projects = projects.slice(0, limit);
      }
    }

    res.json(projects);
  } catch (error) {
    console.error('Failed to read projects:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
