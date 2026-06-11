export interface Message {
    id: string
    text: string
    sender: 'user' | 'assistant'
    timestamp: Date
}

export interface ChatHistoryMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface StreamChunk {
    delta?: string
    error?: string
    done?: boolean
}
