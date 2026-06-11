import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors());
app.post('/api/chat/stream', async (req, res) => {
    const { message, history } = req.body;
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
        const lmUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234';
        const token = process.env.API_TOKEN;
        const modelName = process.env.LM_MODEL_NAME || 'default-model';
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        const messages = [
            { role: 'system', content: 'You are a helpful assistant.' },
            ...((history || []).filter((item) => typeof item?.role === 'string' && typeof item?.content === 'string')),
            { role: 'user', content: message }
        ];
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        const lmResponse = await fetch(`${lmUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: modelName,
                messages,
                max_tokens: 500,
                stream: true
            })
        });
        if (!lmResponse.ok) {
            const errorData = await lmResponse.json().catch(() => ({}));
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
            if (done)
                break;
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
                }
                catch {
                    // Ignore malformed streaming chunks and continue.
                }
            }
        }
        req.off('close', clientClosed);
        res.write('event: done\ndata: {"done":true}\n\n');
        res.end();
    }
    catch (error) {
        console.error('Streaming Error:', error);
        res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' })}\n\n`);
        res.end();
    }
});
// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
}
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
