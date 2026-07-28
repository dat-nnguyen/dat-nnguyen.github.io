const express = require('express');
const cors = require('cors');

const postRoutes = require('../backend/content-service/routes/postRoutes');
const aboutRoutes = require('../backend/content-service/routes/aboutRoutes');
const projectRoutes = require('../backend/content-service/routes/projectRoutes');
const commentsRoutes = require('../backend/interaction-service/routes/commentsRoutes')({
  query: () => Promise.reject(new Error('PostgreSQL not configured')),
});

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/posts', postRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/comments', commentsRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: "🚀 Dat Nguyen's Personal Website API (Vercel Serverless)",
    status: 'online',
    endpoints: ['/api/posts', '/api/about', '/api/projects', '/api/comments'],
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'API Gateway (Serverless)' }));

module.exports = app;
