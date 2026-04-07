<template>
  <Transition name="bubble" appear>
    <div :class="['flex w-full gap-2.5', isUser ? 'justify-end' : 'justify-start']">
      <div v-if="!isUser" class="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mt-0.5">
        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .23 2.678-1.198 2.678H4.796c-1.427 0-2.197-1.678-1.197-2.678L5 14.5"
          />
        </svg>
      </div>

      <div class="flex flex-col gap-1" :class="isUser ? 'items-end' : 'items-start'">
        <span class="text-[11px] text-gray-400 px-1">{{ isUser ? '你' : '面试官' }}</span>

        <div
          :class="[
            'max-w-[78vw] md:max-w-[500px] rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm',
          ]"
        >
          <span v-if="!message.content" class="inline-flex items-center gap-1 text-gray-400">
            <LoadingDots />
          </span>
          <template v-else>
            <span class="whitespace-pre-wrap break-words">{{ message.content }}</span>
            <span v-if="message.isStreaming" class="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle animate-pulse" />
          </template>
        </div>
      </div>

      <div v-if="isUser" class="shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mt-0.5">
        <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import LoadingDots from '@/components/LoadingDots.vue'

const props = defineProps({
  message: { type: Object, required: true },
})

const isUser = computed(() => props.message.role === 'user')
</script>

<style scoped>
.bubble-enter-active {
  transition: all 0.2s ease-out;
}

.bubble-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
