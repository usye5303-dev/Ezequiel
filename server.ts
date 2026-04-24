import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Rota de saúde para teste básico
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: process.env.NODE_ENV });
  });

  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV}, CWD: ${process.cwd()}`);
  console.log(`[SERVER] Modo: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);

  const distPath = path.resolve(__dirname, 'dist');
  
  if (isProduction) {
    console.log(`[SERVER] Servindo estáticos de: ${distPath}`);
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  } else {
    console.log('[SERVER] Configurando Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.use('*', (req, res) => {
      res.status(404).send('Servidor em modo desenvolvimento não encontrou essa rota.');
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
