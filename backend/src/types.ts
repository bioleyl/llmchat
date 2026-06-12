export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestBody {
  message?: string;
  history?: ChatHistoryMessage[];
}

export interface Model {
  id: string;
  object: string;
  owned_by: string;
  created: number;
}