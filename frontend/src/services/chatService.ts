import type { ChatHistoryMessage, StreamChunk } from '../types/chat'

interface StreamChatPayload {
    message: string
    history: ChatHistoryMessage[]
}

export async function streamChat(
    payload: StreamChatPayload,
    onDelta: (delta: string) => void
): Promise<string> {
    const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok || !response.body) {
        throw new Error('Failed to fetch streaming response from backend')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
            const lines = event.split('\n')
            for (const line of lines) {
                if (!line.startsWith('data:')) {
                    continue
                }

                const payloadText = line.replace(/^data:\s*/, '')
                if (!payloadText) {
                    continue
                }

                try {
                    const chunk = JSON.parse(payloadText) as StreamChunk

                    if (chunk.error) {
                        throw new Error(chunk.error)
                    }

                    if (typeof chunk.delta === 'string') {
                        fullText += chunk.delta
                        onDelta(chunk.delta)
                    }
                } catch (error) {
                    if (error instanceof Error) {
                        throw error
                    }
                }
            }
        }
    }

    return fullText
}
