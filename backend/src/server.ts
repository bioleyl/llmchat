import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { streamChatResponse } from './streamingService.js';
import { config } from './config.js';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(cors());

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