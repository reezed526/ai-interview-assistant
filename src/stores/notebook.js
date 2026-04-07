import { defineStore } from 'pinia'
import {
  clearNotebookEntries,
  createNotebookEntry,
  deleteNotebookEntry,
  fetchNotebookEntries,
} from '@/services/user-data.js'

export const useNotebookStore = defineStore('notebook', {
  state: () => ({
    entries: [],
    loading: false,
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
    async hydrate() {
      this.loading = true
      try {
        const { entries = [] } = await fetchNotebookEntries()
        this.entries = entries
      } catch {
        this.entries = []
      } finally {
        this.loading = false
      }
    },

    async addEntry(entry) {
      const { entry: savedEntry } = await createNotebookEntry(entry)
      this.entries.unshift(savedEntry)
      return savedEntry
    },

    async removeEntry(id) {
      await deleteNotebookEntry(id)
      this.entries = this.entries.filter((entry) => entry.id !== id)
    },

    async clearAll() {
      await clearNotebookEntries()
      this.entries = []
    },

    clearLocalState() {
      this.entries = []
      this.loading = false
    },
  },
})
