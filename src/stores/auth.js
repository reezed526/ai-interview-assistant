import { defineStore } from 'pinia'
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '@/services/auth.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.currentUser?.id),
    displayName: (state) => state.currentUser?.name || state.currentUser?.email || '',
  },

  actions: {
    async restoreSession() {
      try {
        const { user } = await fetchCurrentUser()
        this.currentUser = user
      } catch {
        this.currentUser = null
      } finally {
        this.initialized = true
      }
    },

    async register(payload) {
      const { user } = await registerUser(payload)
      this.currentUser = user
      this.initialized = true
      return user
    },

    async login(payload) {
      const { user } = await loginUser(payload)
      this.currentUser = user
      this.initialized = true
      return user
    },

    async logout() {
      try {
        await logoutUser()
      } finally {
        this.currentUser = null
        this.initialized = true
      }
    },
  },
})
