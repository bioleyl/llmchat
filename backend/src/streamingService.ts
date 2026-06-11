import { ChatHistoryMessage, ChatRequestBody } from './types.js';
import { filterChatHistoryMessages } from './helpers.js';
import { config } from './config.js';

export async function streamChatResponse(
  req: any,
  res: any,
  requestBody: ChatRequestBody
): Promise<void> {
  const { message, history } = requestBody;

  if (!message || typeof message !== 'string') {
    res.status(400);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('event: error\ndata: {"error":"Missing or invalid message parameter"}\n\n');
    res.end();
    return;
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const messages: ChatHistoryMessage[] = [
      { role: 'system', content: 'You are a helpful assistant specializes in code and your name is Marvin. When the language is not specified, you work in typescript.' },
      ...filterChatHistoryMessages(history || []),
      { role: 'user', content: message }
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiToken) {
      headers.Authorization = `Bearer ${config.apiToken}`;
    }

    const lmResponse = await fetch(`${config.lmStudioUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.modelName,
        messages,
        max_tokens: 2000,
        stream: true
      })
    });

    if (!lmResponse.ok) {
      const errorData: any = await lmResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to get response from LM Studio');
    }

    if (!lmResponse.body) {
      throw new Error('LM Studio returned an empty response body');
    }

    const reader = lmResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const clientClosed = () => {
      reader.cancel().catch(() => undefined);
    };

    req.on('close', clientClosed);

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
    console.error('Streaming Error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' })}\n\n`);
    res.end();
  }
}