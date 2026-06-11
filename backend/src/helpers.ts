import { ChatHistoryMessage } from './types.js';

export function isChatHistoryMessage(item: any): item is ChatHistoryMessage {
  return typeof item?.role === 'string' && 
         typeof item?.content === 'string' &&
         (item.role === 'user' || item.role === 'assistant' || item.role === 'system');
}

export function filterChatHistoryMessages(history: any[]): ChatHistoryMessage[] {
  return history.filter(isChatHistoryMessage);
}