import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { streamChatResponse } from './streamingService.js';
import { config } from './config.js';
import { getAvailableModels } from './llmProxyService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app: Express = express();

// Middleware
app.use(express.json());
app.use(cors());

app.get('/v1/models', async (req, res) => {
  const models = await getAvailableModels();
  res.json(models);
});

app.post('/api/chat/stream', async (req, res) => {
  await streamChatResponse(req, res, req.body);
});

// Serve frontend build in production
if (config.nodeEnv === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
}

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});