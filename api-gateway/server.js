const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

// Direct route imports as production fallback for single-instance cloud deployment
const postRoutes = require('../backend/content-service/routes/postRoutes');
const aboutRoutes = require('../backend/content-service/routes/aboutRoutes');
const projectRoutes = require('../backend/content-service/routes/projectRoutes');
const commentsRoutes = require('../backend/interaction-service/routes/commentsRoutes')({
  query: () => Promise.reject(new Error('PostgreSQL not configured')),
});

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL;
const INTERACTION_SERVICE_URL = process.env.INTERACTION_SERVICE_URL;

// Content Service Routes
if (CONTENT_SERVICE_URL) {
  app.use(createProxyMiddleware({ pathFilter: '/api/posts', target: CONTENT_SERVICE_URL, changeOrigin: true }));
  app.use(createProxyMiddleware({ pathFilter: '/api/about', target: CONTENT_SERVICE_URL, changeOrigin: true }));
  app.use(createProxyMiddleware({ pathFilter: '/api/projects', target: CONTENT_SERVICE_URL, changeOrigin: true }));
} else {
  app.use('/api/posts', postRoutes);
  app.use('/api/about', aboutRoutes);
  app.use('/api/projects', projectRoutes);
}

// Interaction Service Routes
if (INTERACTION_SERVICE_URL) {
  app.use(createProxyMiddleware({ pathFilter: '/api/comments', target: INTERACTION_SERVICE_URL, changeOrigin: true }));
} else {
  app.use('/api/comments', commentsRoutes);
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'API Gateway' }));

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway is running on port ${PORT}`);
});



