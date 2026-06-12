import { Request, Response } from 'express';
import { streamChatResponse } from '../services/streamingService.js';
import { getAvailableModels } from '../services/llmProxyService.js';

export const chatController = {
  async streamChat(req: Request, res: Response) {
    try {
      await streamChatResponse(req, res, req.body);
    } catch (error) {
      console.error('Error in chat controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getModels(req: Request, res: Response) {
    try {
      const models = await getAvailableModels();
      res.json(models);
    } catch (error) {
      console.error('Error getting models:', error);
      res.status(500).json({ error: 'Failed to fetch models' });
    }
  }
};