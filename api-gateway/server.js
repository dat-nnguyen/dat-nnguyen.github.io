const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 5050; // Port for the API Gateway server

app.use(cors());

// Route A: Content Service (Port 5001) - Handles Posts
app.use(
  createProxyMiddleware({
    pathFilter: '/api/posts',
    target: 'http://localhost:5001',
    changeOrigin: true,
  }),
);

// Route B: Content Service (Port 5001) - Handles Bio/About
app.use(
  createProxyMiddleware({
    pathFilter: '/api/about',
    target: 'http://localhost:5001',
    changeOrigin: true,
  }),
);

// Route C: Interaction Service (Port 5002) - Handles Comments
app.use(
  createProxyMiddleware({
    pathFilter: '/api/comments',
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

