<template>
  <div class="min-h-screen bg-gray-50 pb-16">
    <header class="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
      <RouterLink to="/" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
        <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </RouterLink>
      <div>
        <h1 class="text-base font-bold text-gray-900 leading-none">面试报告</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ store.jobType }}</p>
      </div>
    </header>

    <div v-if="isLoading" class="max-w-xl mx-auto px-4 mt-6 space-y-4">
      <div class="bg-white rounded-3xl p-8 text-center animate-pulse">
        <div class="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4" />
        <div class="h-4 bg-gray-200 rounded-full w-32 mx-auto mb-2" />
        <div class="h-3 bg-gray-100 rounded-full w-24 mx-auto" />
      </div>
      <div class="bg-white rounded-3xl p-6 animate-pulse">
        <div class="h-3 bg-gray-200 rounded-full w-24 mb-4" />
        <div class="h-56 bg-gray-100 rounded-2xl" />
      </div>
      <div v-for="i in 3" :key="i" class="bg-white rounded-2xl p-5 animate-pulse">
        <div class="h-3 bg-gray-200 rounded-full w-3/4 mb-3" />
        <div class="h-3 bg-gray-100 rounded-full w-full mb-2" />
        <div class="h-3 bg-gray-100 rounded-full w-5/6" />
      </div>
    </div>

    <div v-else-if="report" class="max-w-xl mx-auto px-4 mt-6 space-y-4">
      <div class="bg-white rounded-3xl p-8 text-center shadow-sm">
        <div class="relative inline-flex items-center justify-center w-28 h-28 mb-4">
          <svg class="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" stroke-width="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              :stroke="ringColor"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="`${ringProgress} 276.46`"
              class="transition-all duration-1000"
            />
          </svg>
          <span class="absolute text-3xl font-bold" :class="scoreTextColor">{{ displayScore }}</span>
        </div>
        <p class="text-base font-semibold text-gray-800">综合得分</p>
        <p class="text-sm text-gray-400 mt-1">{{ scoreLabel }}</p>
      </div>

      <div class="bg-white rounded-3xl p-6 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-700 mb-1">五维能力评估</h2>
        <RadarChart :dimensions="report.dimensions" />
        <div class="grid grid-cols-5 gap-1 mt-2">
          <div
            v-for="(item, key) in dimensionList"
            :key="key"
            class="text-center"
          >
            <p class="text-sm font-bold" :class="dimColor(item.score)">{{ item.score }}</p>
            <p class="text-[10px] text-gray-400 mt-0.5 leading-tight">{{ item.label }}</p>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-base">建</span>
          <h2 class="text-sm font-semibold text-blue-800">AI 整体建议</h2>
        </div>
        <p class="text-sm text-blue-900 leading-relaxed">{{ report.overallSuggestion }}</p>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-gray-700 px-1 mb-3">逐题点评</h2>
        <div class="space-y-3">
          <ScoreCard
            v-for="(review, i) in report.questionReviews"
            :key="i"
            :review="review"
            :index="i + 1"
            @save-to-notebook="saveToNotebook(review, i)"
          />
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          @click="restart"
          class="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          再来一次
        </button>
        <RouterLink
          to="/notebook"
          class="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-medium text-sm text-center hover:bg-blue-700 transition-colors"
        >
          查看错题本
        </RouterLink>
      </div>
    </div>

    <div v-else class="max-w-xl mx-auto px-4 mt-16 text-center">
      <p class="text-4xl mb-4">错</p>
      <p class="text-gray-600 font-medium mb-1">报告生成失败</p>
      <p class="text-sm text-gray-400 mb-6">{{ errorMsg }}</p>
      <button
        @click="fetchReport"
        class="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700"
      >
        重新生成
      </button>
    </div>

    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 z-50"
      >
        <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        已保存到错题本
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useInterviewStore } from '@/stores/interview.js'
import { useNotebookStore } from '@/stores/notebook.js'
import { evaluateInterview } from '@/services/api.js'
import RadarChart from '@/components/RadarChart.vue'
import ScoreCard from '@/components/ScoreCard.vue'

const router = useRouter()
const store = useInterviewStore()
const notebookStore = useNotebookStore()

const report = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')
const toastVisible = ref(false)

const displayScore = ref(0)
const ringProgress = ref(0)
const savedIndices = ref(new Set())

function animateScore(target) {
  const duration = 900
  const start = Date.now()

  const tick = () => {
    const elapsed = Date.now() - start
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)

    displayScore.value = Math.round(target * ease)
    ringProgress.value = parseFloat(((target / 100) * 276.46 * ease).toFixed(2))

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

watch(report, (value) => {
  if (value?.totalScore != null) {
    animateScore(value.totalScore)
  }
})

const ringColor = computed(() => {
  const score = report.value?.totalScore ?? 0
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
})

const scoreTextColor = computed(() => {
  const score = report.value?.totalScore ?? 0
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-500'
  return 'text-red-500'
})

const scoreLabel = computed(() => {
  const score = report.value?.totalScore ?? 0
  if (score >= 90) return '优秀，表现很亮眼'
  if (score >= 80) return '良好，整体表现不错'
  if (score >= 60) return '及格，仍有提升空间'
  return '需要继续加强练习'
})

const DIMENSION_LABELS = {
  logic: '逻辑性',
  completeness: '完整性',
  depth: '专业深度',
  expression: '表达力',
  relevance: '岗位匹配',
}

const dimensionList = computed(() =>
  Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
    label,
    score: report.value?.dimensions?.[key] ?? 0,
  })),
)

function dimColor(score) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-500'
  return 'text-red-500'
}

async function fetchReport() {
  isLoading.value = true
  errorMsg.value = ''

  try {
    const conversation = store.messages
      .filter((message) => typeof message.content === 'string' && message.content.trim().length > 0)
      .map(({ role, content, questionIndex, isFollowUp }) => ({
        role,
        content,
        questionIndex,
        isFollowUp,
      }))

    if (conversation.length === 0) {
      throw new Error('对话记录为空，无法生成报告。')
    }

    const result = await evaluateInterview({
      jobType: store.jobType,
      jobDescription: store.jobDescription,
      conversation,
    })

    store.setReport(result)
    report.value = result
  } catch (error) {
    console.error('[ReportPage] evaluate failed:', error)
    errorMsg.value = error?.message ?? '请检查网络、接口配置或 API Key。'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!store.jobType) {
    router.replace('/')
    return
  }

  if (store.report) {
    report.value = store.report
    isLoading.value = false
    return
  }

  fetchReport()
})

async function saveToNotebook(review, idx) {
  if (savedIndices.value.has(idx)) {
    return
  }

  await notebookStore.addEntry({
    jobType: store.jobType,
    question: review.question,
    userAnswer: review.userAnswer,
    feedback: review.feedback,
    betterDirection: review.betterDirection,
    score: review.score,
  })

  savedIndices.value.add(idx)
  showToast()
}

function showToast() {
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
  }, 2200)
}

function restart() {
  void store.reset()
  router.push('/')
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
