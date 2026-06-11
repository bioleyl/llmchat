<script setup lang="ts">
defineProps<{
    title: string
    subtitle: string
    isSending: boolean
    isVisibleOnMobile: boolean
}>()

const emit = defineEmits<{
    (e: 'new-chat'): void
}>()
</script>

<template>
    <header :class="['chat-header', { 'mobile-hidden': !isVisibleOnMobile }]">
        <img class="brand-logo" src="https://www.syware.ch/img/syware.png" alt="Syware logo" loading="lazy" />

        <div class="header-text">
            <h1>{{ title }}</h1>
            <p class="subtitle">{{ subtitle }}</p>
        </div>

        <button class="new-chat-btn" :disabled="isSending" @click="emit('new-chat')" type="button">
            New chat
        </button>
    </header>
</template>

<style scoped>
.chat-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 20px;
    border-bottom: 1px solid #9ca3af;
    background: #e5e7eb;
}

.brand-logo {
    width: clamp(52px, 7vw, 76px);
    height: auto;
    object-fit: contain;
    flex-shrink: 0;
}

.header-text {
    display: grid;
    gap: 6px;
    text-align: center;
}

h1 {
    margin: 0;
    font-size: clamp(1.2rem, 2vw, 1.9rem);
    font-weight: 700;
    color: #0f172a;
}

.subtitle {
    margin: 0;
    color: #4b5563;
    font-size: 0.9rem;
}

.new-chat-btn {
    border: 1px solid #4b5563;
    border-radius: 4px;
    padding: 10px 16px;
    background: #4b5563;
    color: #f8fafc;
    font-weight: 600;
    cursor: pointer;
}

.new-chat-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@media (max-width: 640px) {
    .chat-header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 5;
        grid-template-columns: auto 1fr;
        grid-template-areas:
            'logo button'
            'text text';
        padding: 14px 16px 12px;
        border-bottom: 1px solid #9ca3af;
        background: rgba(229, 231, 235, 0.96);
        row-gap: 10px;
        transition: transform 220ms ease, opacity 220ms ease;
        transform: translateY(0);
        opacity: 1;
        will-change: transform;
    }

    .chat-header.mobile-hidden {
        transform: translateY(-120%);
        opacity: 0;
        pointer-events: none;
    }

    .brand-logo {
        grid-area: logo;
    }

    .new-chat-btn {
        grid-area: button;
        justify-self: end;
        padding: 9px 14px;
    }

    .header-text {
        grid-area: text;
    }
}
</style>
