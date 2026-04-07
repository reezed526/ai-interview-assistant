<template>
  <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
    <button
      class="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/70 transition-colors"
      @click="expanded = !expanded"
    >
      <span class="shrink-0 w-7 h-7 rounded-xl bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-center">
        {{ index }}
      </span>

      <p class="flex-1 text-sm font-medium text-gray-900 leading-snug line-clamp-2">
        {{ review.question }}
      </p>

      <div class="shrink-0 flex items-center gap-2">
        <span class="text-base font-bold" :class="scoreColor">{{ review.score }}</span>
        <svg
          class="w-4 h-4 text-gray-400 transition-transform duration-200"
          :class="expanded ? 'rotate-180' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </button>

    <Transition name="collapse">
      <div v-if="expanded" class="px-5 pb-4 space-y-3 border-t border-gray-50">
        <div class="pt-3 text-sm text-gray-500 leading-relaxed">
          <span class="font-medium text-gray-700">我的回答：</span>{{ review.userAnswer }}
        </div>

        <div class="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-sm">要</span>
            <span class="text-xs font-semibold text-amber-700">不足之处</span>
          </div>
          <p class="text-sm text-amber-900 leading-relaxed">{{ review.feedback }}</p>
        </div>

        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-sm">优</span>
            <span class="text-xs font-semibold text-emerald-700">更好的方向</span>
          </div>
          <p class="text-sm text-emerald-900 leading-relaxed">{{ review.betterDirection }}</p>
        </div>

        <button
          @click="handleSave"
          :disabled="saved"
          class="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:cursor-default"
          :class="saved ? 'text-green-600' : 'text-blue-500 hover:text-blue-700'"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path v-if="saved" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {{ saved ? '已保存到错题本' : '保存到错题本' }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  review: { type: Object, required: true },
  index: { type: Number, required: true },
})

const emit = defineEmits(['save-to-notebook'])

const expanded = ref(false)
const saved = ref(false)

const scoreColor = computed(() => {
  if (props.review.score >= 80) return 'text-green-600'
  if (props.review.score >= 60) return 'text-yellow-500'
  return 'text-red-500'
})

function handleSave() {
  if (saved.value) {
    return
  }

  emit('save-to-notebook')
  saved.value = true
}
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
