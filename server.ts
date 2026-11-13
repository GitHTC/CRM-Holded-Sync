import express from 'express';
import 'dotenv/config';
import { createGateway } from './server/gateway';
import cors from 'cors';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      // Sin origin (llamadas servidor/background), extensiones Chrome o lista explícita
      if (!origin || origin.startsWith('chrome-extension://') || allowedOrigins.includes(origin) ||
          (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost'))) return cb(null, true);
      cb(new Error('Origen no permitido'));
    },
  }));

  // Gateway seguro: login con Google + proxy a Holded (la clave vive solo aquí)
  app.use('/api', createGateway());

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
