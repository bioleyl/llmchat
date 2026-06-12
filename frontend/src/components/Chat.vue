<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import ChatComposer from './chat/ChatComposer.vue'
import ChatHeader from './chat/ChatHeader.vue'
import MessageList from './chat/MessageList.vue'
import { streamChat } from '../services/chatService'
import type { ChatHistoryMessage, Message } from '../types/chat'
import { countChatHistoryTokens, countMessageTokens } from '../utils/tokenCounter'

const initialAssistantMessage = 'Hello! I am your local AI assistant. Ask anything to get started.'

const messages = ref<Message[]>([
  {
    id: '1',
    text: initialAssistantMessage,
    sender: 'assistant',
    timestamp: new Date()
  }
])

const chatHistory = ref<ChatHistoryMessage[]>([])
const isSending = ref(false)
const isHeaderVisibleOnMobile = ref(true)
const chatComposerRef = ref<InstanceType<typeof ChatComposer> | null>(null)

// Computed properties for token counts
const userTokens = computed(() => {
  return messages.value
    .filter(msg => msg.sender === 'user')
    .reduce((total, msg) => total + countMessageTokens(msg.text), 0)
})

const assistantTokens = computed(() => {
  return messages.value
    .filter(msg => msg.sender === 'assistant')
    .reduce((total, msg) => total + countMessageTokens(msg.text), 0)
})

const totalTokens = computed(() => {
  return userTokens.value + assistantTokens.value
})

function clearConversation() {
  messages.value = [
    {
      id: '1',
      text: initialAssistantMessage,
      sender: 'assistant',
      timestamp: new Date()
    }
  ]
  chatHistory.value = []
}

function appendAssistantDelta(messageId: string, delta: string) {
  const message = messages.value.find((item) => item.id === messageId)
  if (!message || message.sender !== 'assistant') {
    return
  }
  message.text += delta
}

function handleMessageListScrollDirection(direction: 'up' | 'down') {
  isHeaderVisibleOnMobile.value = direction !== 'down'
}

async function handleSend(text: string) {
  if (!text.trim() || isSending.value) {
    return
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    text,
    sender: 'user',
    timestamp: new Date()
  }

  const assistantMessageId = `${Date.now()}-assistant`
  const assistantMessage: Message = {
    id: assistantMessageId,
    text: '',
    sender: 'assistant',
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  messages.value.push(assistantMessage)
  isSending.value = true

  chatHistory.value.push({ role: 'user', content: text })

  try {
    const fullReply = await streamChat(
      {
        message: text,
        history: chatHistory.value.slice(0, -1)
      },
      (delta) => appendAssistantDelta(assistantMessageId, delta)
    )

    if (fullReply.trim()) {
      chatHistory.value.push({ role: 'assistant', content: fullReply })
    }
  } catch (error) {
    console.error('Chat send failed:', error)
    appendAssistantDelta(assistantMessageId, '\n\nSorry, I could not reach the backend right now.')
  } finally {
    isSending.value = false
    // Focus the input after processing is complete
    nextTick(() => {
      chatComposerRef.value?.focusInput()
    })
  }
}
</script>

<template>
  <section class="chat-page">
    <article class="chat-shell">
      <ChatHeader title="Marvin" subtitle="Ask coding questions, get instant answers." :isSending="isSending"
        :isVisibleOnMobile="isHeaderVisibleOnMobile" @new-chat="clearConversation" />

      <MessageList :messages="messages" :isSending="isSending" :hasFloatingHeaderOnMobile="true"
        @scroll-direction="handleMessageListScrollDirection" />

      <ChatComposer ref="chatComposerRef" :isSending="isSending" :userTokens="userTokens" :assistantTokens="assistantTokens" :totalTokens="totalTokens" @send="handleSend" />
    </article>
  </section>
</template>

<style scoped>
.chat-page {
  height: 100vh;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(14px, 3vw, 30px);
  position: relative;
  overflow: hidden;
  background: #d1d5db;
  font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
}

.chat-shell {
  width: min(1080px, 100%);
  height: calc(100vh - clamp(28px, 6vw, 60px));
  max-height: 960px;
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-radius: 2px;
  border: 1px solid #9ca3af;
  overflow: hidden;
  background: #e5e7eb;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

@media (max-width: 720px) {
  .chat-page {
    padding: 0;
  }

  .chat-shell {
    width: 100%;
    height: 100vh;
    max-height: none;
    grid-template-rows: 1fr auto;
    border-radius: 0;
    border: none;
    position: relative;
  }
}
</style>
