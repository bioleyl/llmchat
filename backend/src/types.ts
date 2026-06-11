export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestBody {
  message?: string;
  history?: ChatHistoryMessage[];
}