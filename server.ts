import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Proxy the Holded API
  app.use('/api/holded', createProxyMiddleware({
    target: 'https://api.holded.com',
    changeOrigin: true,
    pathRewrite: (path, req: any) => {
      // http-proxy-middleware provides req.originalUrl inside Express.
      if (req.originalUrl) {
        return req.originalUrl.replace(/^\/api\/holded/, '/api');
      }
      return path.replace(/^\/api\/holded/, '/api');
    },
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Prevent Holded from blocking standard fetch user agents
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.0.0 Safari/537.36');
        if (req.headers.key) {
          proxyReq.setHeader('key', req.headers.key);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        // Log the response status from holded
        console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
      }
    }
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MY CUSTOM SERVER] Server running on http://localhost:${PORT}`);
  });
}

startServer();
