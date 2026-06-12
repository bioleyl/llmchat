import { Request, Response } from 'express';
import { ChatHistoryMessage, ChatRequestBody } from '../types.js';
import { filterChatHistoryMessages } from '../utils/helpers.js';
import { getChatModelInfo } from './llmProxyService.js';
import { config } from '../config.js';

// Define a type for the response with body property
interface StreamingResponse extends Response {
  body?: any;
}

export async function streamChatResponse(
  req: Request,
  res: Response,
  requestBody: ChatRequestBody
): Promise<void> {
  const { message, history } = requestBody;

  // Validate input
  if (!message || typeof message !== 'string') {
    return handleClientError(res, 'Missing or invalid message parameter');
  }

  try {
    // Set up response headers
    setupResponseHeaders(res);

    // Prepare messages for the LLM
    const messages: ChatHistoryMessage[] = prepareMessages(message, history);

    // Get model information
    const [modelId, url] = getChatModelInfo()[0] || [];
    if (!modelId || !url) {
      throw new Error('No valid model found');
    }

    // Make request to LLM
    const lmResponse = await fetchLMResponse(url, modelId, messages);

    // Handle LM response
    await handleLMResponse(req, res, lmResponse);
  } catch (error) {
    console.error('Streaming Error:', error);
    handleServerError(res, error);
  }
}

function setupResponseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function prepareMessages(message: string, history?: ChatHistoryMessage[]): ChatHistoryMessage[] {
  return [
    { 
      role: 'system', 
      content: 'You are a helpful assistant specializes in code and your name is Marvin. When the language is not specified, you work in typescript.' 
    },
    ...filterChatHistoryMessages(history || []),
    { role: 'user', content: message }
  ];
}

async function fetchLMResponse(url: string, modelId: string, messages: ChatHistoryMessage[]) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.apiToken) {
    headers.Authorization = `Bearer ${config.apiToken}`;
  }

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: 2000,
      stream: true
    })
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to get response from LM Studio');
  }

  if (!response.body) {
    throw new Error('LM Studio returned an empty response body');
  }

  return response;
}

async function handleLMResponse(req: Request, res: Response, lmResponse: Response): Promise<void> {
  const reader = (lmResponse as any).body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const clientClosed = () => {
    reader.cancel().catch(() => undefined);
  };

  req.on('close', clientClosed);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n');
      buffer = chunks.pop() || '';

      for (const line of chunks) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const payload = trimmed.replace(/^data:\s*/, '');

        if (payload === '[DONE]') {
          res.write('event: done\ndata: {"done":true}\n\n');
          res.end();
          req.off('close', clientClosed);
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;

          if (typeof delta === 'string' && delta.length > 0) {
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch {
          // Ignore malformed streaming chunks and continue.
        }
      }
    }

    req.off('close', clientClosed);
    res.write('event: done\ndata: {"done":true}\n\n');
    res.end();
  } catch (error) {
    req.off('close', clientClosed);
    throw error;
  }
}

function handleClientError(res: Response, message: string): void {
  res.status(400);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`event: error\ndata: {"error":"${message}"}\n\n`);
  res.end();
}

function handleServerError(res: Response, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
  res.end();
}