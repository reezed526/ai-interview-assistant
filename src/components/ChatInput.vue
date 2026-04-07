<template>
  <div class="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
    <div class="mx-auto w-full max-w-5xl">
      <div class="flex gap-2 items-end">
        <textarea
          ref="textareaRef"
          v-model="text"
          @keydown.enter.exact.prevent="handleSend"
          @input="autoResize"
          :disabled="disabled || finished"
          :placeholder="placeholder"
          rows="1"
          class="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-shadow leading-relaxed"
          style="font-size: 16px; max-height: 140px; overflow-y: auto;"
        />
        <button
          @click="handleSend"
          :disabled="disabled || finished || !text.trim()"
          class="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          :class="canSend ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-200' : 'bg-gray-200'"
        >
          <svg v-if="loading" class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8H4z" />
          </svg>
          <svg v-else class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.908 6.44H10.5a.75.75 0 0 1 0 1.5H4.187l-1.908 6.44a.75.75 0 0 0 .826.95 28.9 28.9 0 0 0 15.208-8.718.75.75 0 0 0 0-1.076A28.9 28.9 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>

      <p class="text-xs text-gray-400 mt-1.5 ml-1 select-none">
        <template v-if="finished">面试已结束</template>
        <template v-else-if="loading">面试官正在思考...</template>
        <template v-else>Enter 发送，Shift + Enter 换行</template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  finished: { type: Boolean, default: false },
})

const emit = defineEmits(['send'])
const text = ref('')
const textareaRef = ref(null)

const canSend = computed(() => !props.disabled && !props.finished && !props.loading && !!text.value.trim())

const placeholder = computed(() => {
  if (props.finished) return '面试已结束，请查看报告。'
  if (props.loading) return '请等待面试官回复...'
  return '输入你的回答...'
})

function handleSend() {
  if (!canSend.value) {
    return
  }

  emit('send', text.value.trim())
  text.value = ''

  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function autoResize(event) {
  event.target.style.height = 'auto'
  event.target.style.height = `${event.target.scrollHeight}px`
}
</script>
