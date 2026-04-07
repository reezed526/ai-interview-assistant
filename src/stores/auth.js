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
    displayName: (state) => state.currentUser?.name || state.currentUser?.username || '',
    subscriptionPlan: (state) => state.currentUser?.subscriptionPlan || 'free',
    subscriptionLabel: (state) => state.currentUser?.subscriptionLabel || '免费计划',
    interviewRemaining: (state) => state.currentUser?.interviewRemaining ?? 0,
    hasUnlimitedInterviews: (state) => state.currentUser?.interviewRemaining === -1,
    canStartInterview() {
      return this.hasUnlimitedInterviews || this.interviewRemaining > 0
    },
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

    applyUsage(usage) {
      if (!this.currentUser || !usage) return
      this.currentUser = {
        ...this.currentUser,
        subscriptionPlan: usage.subscriptionPlan ?? this.currentUser.subscriptionPlan,
        subscriptionLabel: usage.subscriptionLabel ?? this.currentUser.subscriptionLabel,
        interviewQuota: usage.interviewQuota ?? this.currentUser.interviewQuota,
        interviewUsed: usage.interviewUsed ?? this.currentUser.interviewUsed,
        interviewRemaining: usage.interviewRemaining ?? this.currentUser.interviewRemaining,
      }
    },
  },
})
