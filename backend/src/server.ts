import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config.js';
import { logger } from './middleware/logger.js';
import chatRoutes from './routes/chatRoutes.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app: Express = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(logger);

// Routes
app.use('/', chatRoutes);

// Serve frontend build in production
if (config.nodeEnv === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
}

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});