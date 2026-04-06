import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'

const STORAGE_KEY = 'ai_interview_notebook'

function loadAllEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveAllEntries(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const useNotebookStore = defineStore('notebook', {
  state: () => ({
    entries: [],
  }),

  getters: {
    totalCount: (state) => state.entries.length,

    avgScore: (state) => {
      if (!state.entries.length) return 0
      const sum = state.entries.reduce((acc, entry) => acc + (entry.score ?? 0), 0)
      return Math.round(sum / state.entries.length)
    },

    jobTypes: (state) => [...new Set(state.entries.map((entry) => entry.jobType).filter(Boolean))],
  },

  actions: {
    hydrate() {
      const authStore = useAuthStore()
      const userId = authStore.currentUser?.id
      const allEntries = loadAllEntries()
      this.entries = userId ? (allEntries[userId] ?? []) : []
    },

    addEntry(entry) {
      this.entries.unshift({
        id: `entry_${Date.now()}`,
        date: new Date().toISOString(),
        ...entry,
      })
      this._save()
    },

    removeEntry(id) {
      this.entries = this.entries.filter((entry) => entry.id !== id)
      this._save()
    },

    clearAll() {
      this.entries = []
      this._save()
    },

    _save() {
      const authStore = useAuthStore()
      const userId = authStore.currentUser?.id
      if (!userId) return

      const allEntries = loadAllEntries()
      allEntries[userId] = this.entries
      saveAllEntries(allEntries)
    },
  },
})
