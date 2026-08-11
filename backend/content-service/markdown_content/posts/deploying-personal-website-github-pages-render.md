---
title: "Deploying a Modern Personal Portfolio with GitHub Pages & Render"
category: "technical"
slug: "deploying-personal-website-github-pages-render"
date: "2026-08-11"
---

## Overview

Building a personal portfolio website is a rite of passage for software engineers. However, managing hosting costs and deployment complexity can often be a headache.

In this article, I share how I deployed my personal website for free using **GitHub Pages** for the static frontend and **Render** for the Node.js API Gateway backend.

---

## The Architecture

Our personal website architecture consists of two decoupled layers:

1. **Frontend**: Built with Vite and vanilla JavaScript, hosted on GitHub Pages with automated CI/CD via GitHub Actions.
2. **Backend API Gateway**: A Node.js Express service hosted on Render that serves content, handles post endpoints, and processes visitor interactions.

```
+------------------------+          HTTP Fetch          +--------------------------+
|  GitHub Pages          |  ------------------------->  |  Render (Node.js API)    |
|  (Static Assets/Vite)  |   https://...onrender.com    |  (Express & Gateway)     |
+------------------------+                              +--------------------------+
```

---

## Key Deployment Steps

### 1. Setting up GitHub Actions CI/CD
We automated static website builds by adding a `.github/workflows/deploy.yml` workflow. Every time code is pushed to `main`, GitHub Actions automatically compiles the Vite bundle and deploys the static output directly to GitHub Pages.

### 2. Dynamically Configuring API URLs
To make sure the frontend calls the live Render API instead of relative local endpoints, we configure `VITE_API_BASE_URL` dynamically:

```javascript
const rawApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_BASE_URL = rawApiBase.endsWith('/api') ? rawApiBase.slice(0, -4) : rawApiBase;
```

---

## Conclusion

Combining static hosting on GitHub Pages with serverless/containerized backend services on Render gives us high reliability, zero hosting costs, and fast global delivery.
