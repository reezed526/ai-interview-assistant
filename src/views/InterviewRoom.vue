<template>
  <div class="h-dvh flex flex-col bg-gray-50 overflow-hidden">
    <header class="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-900 leading-none">{{ store.jobType }} 面试</p>
          <p class="text-xs text-gray-400 mt-0.5 leading-none">{{ progressText }}</p>
        </div>
      </div>

      <button
        v-if="store.status === 'in-progress'"
        @click="confirmEnd"
        class="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-xl px-3 py-1.5 transition-colors min-h-[36px]"
      >
        结束面试
      </button>
    </header>

    <div ref="listRef" class="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      <ChatBubble
        v-for="msg in store.messages"
        :key="msg.id"
        :message="msg"
      />

      <Transition name="fade">
        <div v-if="hasError" class="flex justify-center">
          <div class="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-center max-w-xs">
            <p class="text-sm text-red-600 mb-2">请求失败，请检查网络或 API 配置。</p>
            <button
              @click="retryLastRequest"
              class="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              重试
            </button>
          </div>
        </div>
      </Transition>

      <div ref="bottomRef" class="h-1" />
    </div>

    <Transition name="overlay">
      <div
        v-if="showEndOverlay"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
        @click.self="showEndOverlay = false"
      >
        <div class="bg-white rounded-3xl px-8 py-8 text-center shadow-2xl w-full max-w-sm">
          <div class="text-5xl mb-4">🏁</div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">面试结束</h2>
          <p class="text-sm text-gray-500 mb-6 leading-relaxed">
            AI 正在整理你的表现，
            <br />
            稍后即可查看详细报告。
          </p>

          <div class="flex gap-3">
            <button
              @click="showEndOverlay = false"
              class="flex-1 py-3 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              返回对话
            </button>
            <button
              @click="goToReport"
              class="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              查看报告
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="safe-bottom">
      <ChatInput
        :loading="isLoading"
        :finished="store.status === 'finished'"
        @send="handleSend"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInterviewStore } from '@/stores/interview.js'
import { sendChatMessage } from '@/services/api.js'
import ChatBubble from '@/components/ChatBubble.vue'
import ChatInput from '@/components/ChatInput.vue'

const router = useRouter()
const store = useInterviewStore()

const listRef = ref(null)
const bottomRef = ref(null)
const isLoading = ref(false)
const hasError = ref(false)
const showEndOverlay = ref(false)

const progressText = computed(() => `第 ${store.currentQuestionIndex} 题 / 共 ${store.totalQuestionCount} 题`)

onMounted(() => {
  if (store.status !== 'in-progress') {
    router.replace('/')
    return
  }

  if (store.messages.length === 0) {
    requestAI()
    return
  }

  scrollToBottom('instant')
})

async function scrollToBottom(behavior = 'smooth') {
  await nextTick()
  bottomRef.value?.scrollIntoView({ behavior, block: 'end' })
}

async function requestAI() {
  isLoading.value = true
  hasError.value = false

  const stateBeforeRequest = {
    questionCount: store.questionCount,
    followUpCount: store.followUpCount,
  }

  const msgId = store.addMessage({
    role: 'assistant',
    content: '',
    isStreaming: true,
    questionIndex: Math.max(stateBeforeRequest.questionCount, 1),
    isFollowUp: false,
  })
  await scrollToBottom()

  const history = store.messages
    .slice(0, -1)
    .map(({ role, content }) => ({ role, content }))

  let meta = null
  try {
    meta = await sendChatMessage({
      jobType: store.jobType,
      jobDescription: store.jobDescription,
      messages: history,
      questionCount: store.questionCount,
      totalQuestionCount: store.totalQuestionCount,
      followUpCount: store.followUpCount,
      onChunk(chunk) {
        store.appendToLastMessage(chunk)
        bottomRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      },
    })
  } catch (error) {
    store.messages.pop()
    hasError.value = true
    console.error('[InterviewRoom] chat request failed:', error)
  } finally {
    store.setStreamingDone(msgId)
    isLoading.value = false
    await scrollToBottom()

    if (!hasError.value) {
      finalizeAssistantTurn(msgId, meta, stateBeforeRequest)
      checkInterviewEnd()
    }
  }
}

function retryLastRequest() {
  hasError.value = false
  requestAI()
}

function checkInterviewEnd() {
  const last = store.lastMessage
  if (last?.role === 'assistant' && last.content.startsWith('好的，今天的面试就到这里')) {
    store.finishInterview()
    showEndOverlay.value = true
  }
}

function finalizeAssistantTurn(msgId, meta, stateBeforeRequest) {
  const isFollowUp = meta?.action === 'follow_up'
  const questionIndex = meta?.questionIndex
    ?? (isFollowUp ? Math.max(stateBeforeRequest.questionCount, 1) : stateBeforeRequest.questionCount + 1)
  const totalQuestionCount = meta?.totalQuestionCount ?? store.totalQuestionCount

  store.finalizeAssistantTurn(msgId, { isFollowUp, questionIndex, totalQuestionCount })
}

async function handleSend(text) {
  if (!text || isLoading.value || store.status !== 'in-progress') {
    return
  }

  hasError.value = false
  const previousAssistant = store.lastMessage
  store.addMessage({
    role: 'user',
    content: text,
    questionIndex: previousAssistant?.questionIndex ?? Math.max(store.questionCount, 1),
    isFollowUp: previousAssistant?.isFollowUp ?? false,
  })
  await scrollToBottom()
  requestAI()
}

function confirmEnd() {
  store.finishInterview()
  showEndOverlay.value = true
}

function goToReport() {
  router.push('/report')
}
</script>

<style scoped>
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
