import { Request, Response } from 'express';
import { request } from "undici";

const MODEL_MAP = {
    "fast-ts": "http://localhost:8081",
    "fullstack": "http://localhost:8080",
};

export function getChatModelInfo(): [modelId: string, url: string][] {
    return Object.entries(MODEL_MAP).filter(([id, url]) => id === "fast-ts");
}

export function getAvailableModels() {
    return {
        object: "list",
        data: Object.keys(MODEL_MAP).map((id) => ({
            id,
            object: "model",
            owned_by: "local-gateway",
            created: 0,
        })),
    }
}

export async function llmProxy(req: Request, res: Response) {
    const model = req.body.model;
    //@ts-ignore
    const target = MODEL_MAP[model];

    if (!target) {
        return res.status(400).json({
            error: { message: `Unknown model: ${model}` },
        });
    }

    const upstreamUrl = `${target}/v1/chat/completions`;

    const upstream = await request(upstreamUrl, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "accept": "text/event-stream",
        },
        body: JSON.stringify(req.body),
    });

    /**
     * CRITICAL: streaming headers must pass through unchanged
     */
    res.writeHead(upstream.statusCode, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive",
    });

    /**
     * CRITICAL: raw byte streaming (NO buffering)
     */
    upstream.body.on("data", (chunk) => {
        res.write(chunk);
    });

    upstream.body.on("end", () => {
        res.end();
    });

    upstream.body.on("error", (err) => {
        console.error("stream error:", err);
        res.end();
    });

    /**
     * IMPORTANT: handle client disconnect
     */
    req.on("close", () => {
        upstream.body.destroy();
    });
}