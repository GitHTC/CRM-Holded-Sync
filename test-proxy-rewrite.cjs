const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use('/api/holded', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: (path, req) => {
    console.log('originalUrl:', req.originalUrl);
    console.log('path:', path);
    if (req.originalUrl) {
      return req.originalUrl.replace(/^\/api\/holded/, '/api');
    }
    return path.replace(/^\/api\/holded/, '/api');
  }
}));
app.listen(3002, () => console.log('started 3002'));
