import { defineStore } from 'pinia'

const STORAGE_KEY = 'ai_interview_notebook'

export const useNotebookStore = defineStore('notebook', {
  state: () => ({
    entries: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
  }),

  getters: {
    totalCount: (state) => state.entries.length,

    avgScore: (state) => {
      if (!state.entries.length) return 0
      const sum = state.entries.reduce((acc, e) => acc + (e.score ?? 0), 0)
      return Math.round(sum / state.entries.length)
    },

    /** 所有出现过的岗位类型（去重） */
    jobTypes: (state) => [...new Set(state.entries.map((e) => e.jobType).filter(Boolean))],
  },

  actions: {
    addEntry(entry) {
      this.entries.unshift({
        id: `entry_${Date.now()}`,
        date: new Date().toISOString(),
        ...entry,
      })
      this._save()
    },

    removeEntry(id) {
      this.entries = this.entries.filter((e) => e.id !== id)
      this._save()
    },

    clearAll() {
      this.entries = []
      this._save()
    },

    _save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries))
    },
  },
})
