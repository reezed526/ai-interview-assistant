<template>
  <div class="min-h-screen bg-gray-50 pb-16">

    <!-- 顶部导航 -->
    <header class="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </RouterLink>
        <div>
          <h1 class="text-base font-bold text-gray-900 leading-none">错题本</h1>
          <p class="text-xs text-gray-400 mt-0.5">共 {{ store.totalCount }} 道题</p>
        </div>
      </div>
      <!-- 清空按钮 -->
      <button
        v-if="store.totalCount > 0"
        @click="showClearConfirm = true"
        class="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
      >
        清空全部
      </button>
    </header>

    <!-- 有内容 -->
    <div v-if="store.totalCount > 0" class="max-w-xl mx-auto px-4 mt-5 space-y-4">

      <!-- 统计卡片 -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p class="text-2xl font-bold text-gray-900">{{ store.totalCount }}</p>
          <p class="text-xs text-gray-400 mt-1">总题数</p>
        </div>
        <div class="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p class="text-2xl font-bold" :class="avgScoreColor">{{ store.avgScore }}</p>
          <p class="text-xs text-gray-400 mt-1">平均分</p>
        </div>
        <div class="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p class="text-2xl font-bold text-gray-900">{{ weakCount }}</p>
          <p class="text-xs text-gray-400 mt-1">待提升</p>
        </div>
      </div>

      <!-- 岗位筛选 -->
      <div v-if="store.jobTypes.length > 1" class="flex gap-2 flex-wrap">
        <button
          @click="activeFilter = ''"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            activeFilter === '' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-200'
          ]"
        >
          全部
        </button>
        <button
          v-for="type in store.jobTypes"
          :key="type"
          @click="activeFilter = type"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            activeFilter === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-200'
          ]"
        >
          {{ type }}
        </button>
      </div>

      <!-- 题目列表 -->
      <TransitionGroup name="list" tag="div" class="space-y-3">
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"
        >
          <!-- 卡片头部 -->
          <button
            class="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-gray-50/70 transition-colors"
            @click="toggleEntry(entry.id)"
          >
            <!-- 得分圆圈 -->
            <div
              class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0.5"
              :class="entry.score >= 80 ? 'bg-green-500' : entry.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'"
            >
              {{ entry.score ?? '?' }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[11px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-medium shrink-0">
                  {{ entry.jobType }}
                </span>
                <span class="text-[11px] text-gray-400 shrink-0">{{ formatDate(entry.date) }}</span>
              </div>
              <p class="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
                {{ entry.question }}
              </p>
            </div>

            <svg
              class="w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform duration-200"
              :class="expandedIds.has(entry.id) ? 'rotate-180' : ''"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <!-- 折叠详情 -->
          <Transition name="collapse">
            <div v-if="expandedIds.has(entry.id)" class="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">

              <div class="text-sm text-gray-500 leading-relaxed">
                <span class="font-medium text-gray-700">我的回答：</span>{{ entry.userAnswer }}
              </div>

              <div class="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p class="text-xs font-semibold text-amber-700 mb-1">⚠️ 不足之处</p>
                <p class="text-sm text-amber-900 leading-relaxed">{{ entry.feedback }}</p>
              </div>

              <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p class="text-xs font-semibold text-emerald-700 mb-1">✅ 更好的方向</p>
                <p class="text-sm text-emerald-900 leading-relaxed">{{ entry.betterDirection }}</p>
              </div>

              <div class="flex justify-end">
                <button
                  @click="removeEntry(entry.id)"
                  class="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </TransitionGroup>

      <!-- 筛选结果为空 -->
      <div v-if="filteredEntries.length === 0" class="text-center py-12 text-gray-400 text-sm">
        该岗位暂无错题
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div class="text-6xl mb-5">📖</div>
      <h2 class="text-lg font-semibold text-gray-700 mb-2">错题本还是空的</h2>
      <p class="text-sm text-gray-400 mb-8 leading-relaxed">
        完成面试后，在报告页点击<br/>
        「保存到错题本」即可归档答错的题目
      </p>
      <RouterLink
        to="/"
        class="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        开始一场面试
      </RouterLink>
    </div>

    <!-- 清空确认弹窗 -->
    <Transition name="overlay">
      <div
        v-if="showClearConfirm"
        class="fixed inset-0 bg-black/40 flex items-end justify-center z-20 pb-safe"
        @click.self="showClearConfirm = false"
      >
        <div class="bg-white rounded-t-3xl w-full max-w-lg px-6 pt-6 pb-10">
          <h3 class="text-base font-bold text-gray-900 mb-1">清空错题本</h3>
          <p class="text-sm text-gray-500 mb-6">所有 {{ store.totalCount }} 道错题将被删除，此操作无法撤销。</p>
          <div class="flex gap-3">
            <button
              @click="showClearConfirm = false"
              class="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-medium"
            >
              取消
            </button>
            <button
              @click="handleClearAll"
              class="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
            >
              确认清空
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useNotebookStore } from '@/stores/notebook.js'

const store = useNotebookStore()

const activeFilter  = ref('')
const expandedIds   = ref(new Set())
const showClearConfirm = ref(false)

// ── 计算 ─────────────────────────────────────────────
const filteredEntries = computed(() =>
  activeFilter.value
    ? store.entries.filter((e) => e.jobType === activeFilter.value)
    : store.entries
)

const weakCount = computed(() =>
  store.entries.filter((e) => (e.score ?? 100) < 60).length
)

const avgScoreColor = computed(() => {
  const s = store.avgScore
  if (s >= 80) return 'text-green-600'
  if (s >= 60) return 'text-yellow-500'
  return 'text-red-500'
})

// ── 操作 ─────────────────────────────────────────────
function toggleEntry(id) {
  const s = new Set(expandedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedIds.value = s
}

function removeEntry(id) {
  expandedIds.value.delete(id)
  store.removeEntry(id)
}

function handleClearAll() {
  expandedIds.value = new Set()
  store.clearAll()
  showClearConfirm.value = false
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* 列表增删动画 */
.list-enter-active { transition: all 0.25s ease; }
.list-leave-active { transition: all 0.2s ease; position: absolute; width: 100%; }
.list-enter-from   { opacity: 0; transform: translateY(-8px); }
.list-leave-to     { opacity: 0; transform: translateX(20px); }

/* 折叠动画 */
.collapse-enter-active, .collapse-leave-active { transition: all 0.2s ease; overflow: hidden; }
.collapse-enter-from, .collapse-leave-to       { max-height: 0; opacity: 0; }
.collapse-enter-to, .collapse-leave-from       { max-height: 600px; opacity: 1; }

/* 弹窗 */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from, .overlay-leave-to       { opacity: 0; }
</style>
