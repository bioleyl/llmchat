/**
 * Simple token counter based on rough estimation.
 * In a real implementation, you would use a proper tokenizer like tiktoken.
 */
export function countTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters (this is a simplification)
  // For more accurate counting, use a proper tokenizer library
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens in a message
 */
export function countMessageTokens(message: string): number {
  return countTokens(message);
}

/**
 * Count tokens in chat history
 */
export function countChatHistoryTokens(history: { role: 'user' | 'assistant', content: string }[]): number {
  return history.reduce((total, item) => total + countTokens(item.content), 0);
}