<script setup lang="ts">
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Message } from '../../types/chat'

type MarkedWithFlag = typeof marked & {
    __hlConfigured?: boolean
}

const markedWithFlag = marked as MarkedWithFlag

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' })
hljs.registerAliases(['js'], { languageName: 'javascript' })
hljs.registerAliases(['ts'], { languageName: 'typescript' })
hljs.registerAliases(['c#', 'cs', 'csharp'], { languageName: 'csharp' })

const LANGUAGE_LABELS: Record<string, string> = {
    bash: 'Bash',
    sh: 'Bash',
    shell: 'Bash',
    javascript: 'JavaScript',
    js: 'JavaScript',
    typescript: 'TypeScript',
    ts: 'TypeScript',
    csharp: 'C#',
    cs: 'C#',
    'c#': 'C#'
}

function normalizeLanguage(lang: string) {
    const lowerLang = lang.trim().toLowerCase()
    if (lowerLang === 'c#') {
        return 'csharp'
    }
    return lowerLang
}

function getLanguageLabel(codeElement: Element | null) {
    if (!codeElement) {
        return 'Code'
    }

    const languageClass = Array.from(codeElement.classList).find((className) =>
        className.startsWith('language-')
    )

    if (!languageClass) {
        return 'Code'
    }

    const language = normalizeLanguage(languageClass.replace('language-', ''))
    return LANGUAGE_LABELS[language] || 'Code'
}

if (!markedWithFlag.__hlConfigured) {
    marked.use(
        markedHighlight({
            langPrefix: 'hljs language-',
            highlight(code, lang) {
                const normalizedLang = lang ? normalizeLanguage(lang) : ''

                if (normalizedLang && hljs.getLanguage(normalizedLang)) {
                    return hljs.highlight(code, { language: normalizedLang }).value
                }

                return hljs.highlightAuto(code).value
            }
        })
    )

    markedWithFlag.__hlConfigured = true
}

const props = defineProps<{
    messages: Message[]
    isSending: boolean
    hasFloatingHeaderOnMobile?: boolean
}>()

const emit = defineEmits<{
    (e: 'scroll-direction', direction: 'up' | 'down'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const lastScrollTop = ref(0)

function decorateCodeBlocks() {
    const container = containerRef.value
    if (!container) {
        return
    }

    const preBlocks = container.querySelectorAll<HTMLElement>('.bubble-content pre')

    for (const pre of preBlocks) {
        if (pre.closest('.code-block')) {
            continue
        }

        const wrapper = document.createElement('div')
        wrapper.className = 'code-block'

        pre.parentNode?.insertBefore(wrapper, pre)
        wrapper.appendChild(pre)

        const languageBadge = document.createElement('span')
        languageBadge.className = 'code-language-badge'
        languageBadge.textContent = getLanguageLabel(pre.querySelector('code'))
        wrapper.appendChild(languageBadge)

        const copyButton = document.createElement('button')
        copyButton.type = 'button'
        copyButton.className = 'copy-code-btn'
        copyButton.textContent = 'Copy'
        copyButton.setAttribute('aria-label', 'Copy code block')

        wrapper.appendChild(copyButton)
    }
}

async function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
}

async function handleCopyClick(event: Event) {
    const target = event.target as HTMLElement
    const button = target.closest('.copy-code-btn') as HTMLButtonElement | null
    if (!button) {
        return
    }

    const wrapper = button.closest('.code-block')
    const codeElement = wrapper?.querySelector('pre code')
    const codeText = codeElement?.textContent?.replace(/\n$/, '')

    if (!codeText) {
        return
    }

    const previousLabel = button.textContent || 'Copy'

    try {
        await copyText(codeText)
        button.textContent = 'Copied'
    } catch {
        button.textContent = 'Failed'
    }

    window.setTimeout(() => {
        button.textContent = previousLabel
    }, 1200)
}

function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    const currentTop = target.scrollTop
    const delta = currentTop - lastScrollTop.value

    // Ignore tiny movements to avoid jitter during momentum scrolling.
    if (Math.abs(delta) < 8) {
        return
    }

    emit('scroll-direction', delta > 0 ? 'down' : 'up')
    lastScrollTop.value = Math.max(0, currentTop)
}

function renderMarkdown(text: string) {
    return marked.parse(text) as string
}

async function scrollToBottom() {
    await nextTick()
    const container = containerRef.value
    if (container) {
        container.scrollTop = container.scrollHeight
    }
}

watch(
    () => [props.messages.length, props.messages.at(-1)?.text, props.isSending],
    async () => {
        await scrollToBottom()
        decorateCodeBlocks()
    },
    { deep: false }
)

onMounted(async () => {
    await nextTick()
    decorateCodeBlocks()
    containerRef.value?.addEventListener('click', handleCopyClick)
})

onBeforeUnmount(() => {
    containerRef.value?.removeEventListener('click', handleCopyClick)
})
</script>

<template>
    <main ref="containerRef" :class="['messages', { 'mobile-header-offset': hasFloatingHeaderOnMobile }]"
        @scroll="handleScroll">
        <div v-for="message in messages" :key="message.id" :class="['bubble', message.sender]">
            <div class="bubble-content" v-html="renderMarkdown(message.text)"></div>
            <small>{{ message.timestamp.toLocaleTimeString() }}</small>
        </div>

        <div v-if="isSending" class="typing-indicator" aria-label="Assistant is typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </main>
</template>

<style scoped>
.messages {
    min-height: 0;
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #d1d5db;
}

.bubble {
    width: fit-content;
    max-width: min(88%, 760px);
    padding: 12px 14px;
    border-radius: 4px;
    box-shadow: none;
    animation: enter 0.22s ease;
}

.bubble.user {
    margin-left: auto;
    border-bottom-right-radius: 2px;
    color: #f8fafc;
    background: #4b5563;
}

.bubble.assistant {
    border-bottom-left-radius: 2px;
    background: #f3f4f6;
    color: #0f172a;
    border: 1px solid #9ca3af;
}

.bubble-content {
    line-height: 1.55;
    font-size: 0.96rem;
}

.bubble-content :deep(p) {
    margin: 0 0 8px;
}

.bubble-content :deep(p:last-child) {
    margin-bottom: 0;
}

.bubble-content :deep(pre) {
    margin: 10px 0;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    background: #0f172a;
    color: #e2e8f0;
}

.bubble-content :deep(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.86em;
}

.bubble-content :deep(.hljs) {
    color: #e5e7eb;
    background: transparent;
}

.bubble-content :deep(.hljs-keyword),
.bubble-content :deep(.hljs-selector-tag),
.bubble-content :deep(.hljs-title.function_) {
    color: #f59e0b;
}

.bubble-content :deep(.hljs-string),
.bubble-content :deep(.hljs-attr),
.bubble-content :deep(.hljs-template-variable) {
    color: #34d399;
}

.bubble-content :deep(.hljs-number),
.bubble-content :deep(.hljs-literal),
.bubble-content :deep(.hljs-symbol) {
    color: #60a5fa;
}

.bubble-content :deep(.hljs-comment),
.bubble-content :deep(.hljs-quote) {
    color: #9ca3af;
    font-style: italic;
}

.bubble-content :deep(.code-block) {
    position: relative;
    margin: 10px 0;
}

.bubble-content :deep(.code-block pre) {
    margin: 0;
    padding-top: 44px;
}

.bubble-content :deep(.copy-code-btn) {
    position: absolute;
    top: 8px;
    right: 8px;
    border: 1px solid #9ca3af;
    border-radius: 3px;
    background: #1f2937;
    color: #e5e7eb;
    padding: 4px 9px;
    font-size: 0.74rem;
    line-height: 1;
    cursor: pointer;
}

.bubble-content :deep(.copy-code-btn:hover) {
    background: #111827;
}

.bubble-content :deep(.code-language-badge) {
    position: absolute;
    top: 8px;
    left: 8px;
    border: 1px solid #6b7280;
    border-radius: 3px;
    background: #374151;
    color: #e5e7eb;
    padding: 4px 8px;
    font-size: 0.72rem;
    line-height: 1;
}

small {
    display: block;
    margin-top: 8px;
    font-size: 0.72rem;
    opacity: 0.66;
}

.typing-indicator {
    display: inline-flex;
    width: fit-content;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 4px;
    border-bottom-left-radius: 2px;
    background: #f3f4f6;
    border: 1px solid #9ca3af;
}

.typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #0f766e;
    animation: typing 1.1s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
    animation-delay: 0.14s;
}

.typing-indicator span:nth-child(3) {
    animation-delay: 0.28s;
}

@keyframes typing {

    0%,
    80%,
    100% {
        transform: translateY(0);
        opacity: 0.4;
    }

    40% {
        transform: translateY(-4px);
        opacity: 1;
    }
}

@keyframes enter {
    from {
        transform: translateY(6px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@media (max-width: 640px) {
    .messages.mobile-header-offset {
        padding-top: 116px;
    }
}
</style>
