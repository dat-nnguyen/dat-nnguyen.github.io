const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 5050; // Port for the API Gateway server

app.use(cors({ origin: 'http://localhost:3000' }));

// Route A: Content Service (Port 5001) - Handles Posts
app.use(
  '/api/posts',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
  }),
);

// Route B: Content Service (Port 5001) - Handles Bio/About
app.use(
  '/api/about',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
  }),
);

// Route C: Interaction Service (Port 5002) - Handles Comments
app.use(
  '/api/comments',
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
  }),
);

// Fallback: Catch everything else
app.use((req, res) => res.status(404).send('Not Found'));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
  console.log(`➡️  Routing /api/posts to Content Service (5001)`);
  console.log(`➡️  Routing /api/about to Content Service (5001)`);
  console.log(`➡️  Routing /api/comments to Interaction Service (5002)`);
});
