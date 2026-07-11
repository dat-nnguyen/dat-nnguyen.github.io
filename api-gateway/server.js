const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 5050; // Port for the API Gateway server

app.use(cors({ origin: 'http://localhost:3000'}));

// route 1: Content Service (5001)
app.use('/api/articles', createProxyMiddleware({ target: 'http://localhost:5001', changeOrigin: true }));

// route 2: Interaction Service (5002)
app.use('/api/comments', createProxyMiddleware({ target: 'http://localhost:5002', changeOrigin: true }));

// fallback: catch everything else
app.use((req, res) => res.status(404).send('Not Found'));

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
  console.log(`Routing /api/articles to Port 5001`);
  console.log(`Routing /api/comments to Port 5002`);
});

