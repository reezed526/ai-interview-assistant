<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex flex-col">
    <header class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <span class="font-bold text-gray-900 text-sm">AI 求职助手</span>
      </div>

      <div class="flex items-center gap-3">
        <RouterLink
          to="/notebook"
          class="relative flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          错题本
          <span
            v-if="notebookCount > 0"
            class="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center leading-none"
          >{{ notebookCount }}</span>
        </RouterLink>

        <div class="hidden sm:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
          <span class="text-xs text-gray-500">当前账号</span>
          <span class="text-sm font-medium text-gray-800">{{ authStore.displayName }}</span>
        </div>

        <button
          @click="handleLogout"
          class="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          退出
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center px-6 pb-12">
      <div class="w-full max-w-xl">
        <div class="text-center mb-10">
          <h1 class="text-4xl font-bold text-gray-900 mb-3 leading-tight">
            模拟真实面试
            <br />
            <span class="text-blue-600">提前找到差距</span>
          </h1>
          <p class="text-gray-500 text-sm leading-relaxed">
            AI 扮演面试官，完成出题、追问、评分和反馈。
            <br />
            每场约 15 分钟，支持任意目标岗位。
          </p>
        </div>

        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-700">目标岗位</label>
            <span v-if="showJobError" class="text-xs text-red-500 animate-pulse">请先输入目标岗位</span>
          </div>

          <input
            v-model.trim="selectedJob"
            type="text"
            placeholder="输入目标岗位，如：字节跳动 C端产品经理"
            class="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-gray-700 placeholder-gray-300 bg-white transition-shadow"
            @input="showJobError = false"
          />

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="job in quickJobs"
              :key="job"
              type="button"
              @click="selectJob(job)"
              :class="[
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                selectedJob === job
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600',
              ]"
            >
              {{ job }}
            </button>
          </div>
        </div>

        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-700">
              粘贴岗位 JD
              <span class="text-gray-400 font-normal ml-1">（可选，越详细越精准）</span>
            </label>
            <span class="text-xs text-gray-400">{{ jobDescription.length }} 字</span>
          </div>

          <textarea
            v-model="jobDescription"
            rows="5"
            placeholder="把招聘 JD 粘贴到这里，AI 会根据岗位要求生成更贴近真实场景的问题。"
            class="w-full px-4 py-3 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-gray-700 placeholder-gray-300 bg-white transition-shadow"
          />
        </div>

        <button
          @click="handleStart"
          class="w-full py-4 rounded-2xl font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2"
          :class="selectedJob
            ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-lg shadow-blue-200'
            : 'bg-gray-300 cursor-not-allowed'"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          开始面试
        </button>

        <div class="mt-8 grid grid-cols-3 gap-3">
          <div v-for="step in steps" :key="step.label" class="text-center">
            <div class="text-xl mb-1">{{ step.icon }}</div>
            <div class="text-xs font-medium text-gray-700">{{ step.label }}</div>
            <div class="text-[11px] text-gray-400 mt-0.5 leading-snug">{{ step.desc }}</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useInterviewStore } from '@/stores/interview.js'
import { useNotebookStore } from '@/stores/notebook.js'

const router = useRouter()
const authStore = useAuthStore()
const interviewStore = useInterviewStore()
const notebookStore = useNotebookStore()

const selectedJob = ref(interviewStore.jobType || '')
const jobDescription = ref(interviewStore.jobDescription || '')
const showJobError = ref(false)

const notebookCount = computed(() => notebookStore.entries.length)

const quickJobs = [
  '产品经理',
  '前端工程师',
  '后端工程师',
  '算法工程师',
  '大客户销售',
  'HRBP',
  '数据分析师',
  '运营',
]

const steps = [
  { icon: '题', label: 'AI 出题', desc: '根据岗位要求生成问题' },
  { icon: '追', label: '深入追问', desc: '围绕细节继续深挖' },
  { icon: '报', label: '多维评分', desc: '生成报告和逐题点评' },
]

function selectJob(value) {
  selectedJob.value = value
  showJobError.value = false
}

function handleStart() {
  if (!selectedJob.value.trim()) {
    showJobError.value = true
    return
  }

  interviewStore.startInterview(selectedJob.value.trim(), jobDescription.value)
  router.push('/interview')
}

async function handleLogout() {
  await interviewStore.reset()
  await authStore.logout()
  notebookStore.clearLocalState()
  router.replace('/auth')
}
</script>
