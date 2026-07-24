---
title: "Building a Node.js API Gateway from Scratch"
category: "technical"
slug: "building-nodejs-api-gateway"
date: "2026-06-15"
---

## Why an API Gateway?

In microservices architecture, having a single entry point simplifies client requests, routing, CORS management, and authentication.

### Key Components

1. **Proxy Middleware**: Route `/api/posts` to the Content Service (Port 5001).
2. **Rate Limiting**: Protect backend services from DDoS attacks.
3. **CORS Policy**: Restrict access to designated frontend origins.

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use('/api/posts', createProxyMiddleware({ target: 'http://localhost:5001' }));
app.listen(5050);
```

