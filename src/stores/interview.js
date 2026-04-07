import { defineStore } from 'pinia'
import { clearInterviewState, fetchInterviewState, saveInterviewState } from '@/services/user-data.js'

function getDefaultState() {
  return {
    jobType: '',
    jobDescription: '',
    messages: [],
    questionCount: 0,
    totalQuestionCount: 6,
    followUpCount: 0,
    status: 'idle',
    report: null,
  }
}

function serializeState(state) {
  return {
    jobType: state.jobType,
    jobDescription: state.jobDescription,
    messages: state.messages,
    questionCount: state.questionCount,
    totalQuestionCount: state.totalQuestionCount,
    followUpCount: state.followUpCount,
    status: state.status,
    report: state.report,
  }
}

export const useInterviewStore = defineStore('interview', {
  state: () => ({
    ...getDefaultState(),
    loading: false,
  }),

  getters: {
    lastMessage: (state) => state.messages[state.messages.length - 1] ?? null,
    roundCount: (state) => state.messages.filter((message) => message.role === 'user').length,
    currentQuestionIndex: (state) => {
      const assistantMessages = state.messages.filter((message) => message.role === 'assistant')
      return assistantMessages[assistantMessages.length - 1]?.questionIndex ?? Math.max(state.questionCount, 1)
    },
  },

  actions: {
    async hydrate() {
      this.loading = true
      try {
        const { state } = await fetchInterviewState()
        this.$patch({
          ...getDefaultState(),
          ...(state || {}),
          loading: false,
        })
      } catch {
        this.$patch({
          ...getDefaultState(),
          loading: false,
        })
      }
    },

    async persist() {
      await saveInterviewState(serializeState(this.$state))
    },

    startInterview(jobType, jobDescription) {
      this.jobType = jobType
      this.jobDescription = jobDescription
      this.messages = []
      this.questionCount = 0
      this.totalQuestionCount = 6
      this.followUpCount = 0
      this.status = 'in-progress'
      this.report = null
      void this.persist()
    },

    addMessage(message) {
      const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      this.messages.push({
        id,
        timestamp: Date.now(),
        isStreaming: false,
        questionIndex: this.questionCount || 1,
        isFollowUp: false,
        ...message,
      })
      void this.persist()
      return id
    },

    appendToLastMessage(chunk) {
      const last = this.messages[this.messages.length - 1]
      if (last) {
        last.content += chunk
      }
    },

    setStreamingDone(id) {
      const msg = this.messages.find((item) => item.id === id)
      if (msg) {
        msg.isStreaming = false
        void this.persist()
      }
    },

    finalizeAssistantTurn(id, { isFollowUp, questionIndex, totalQuestionCount }) {
      const msg = this.messages.find((item) => item.id === id)
      if (!msg) return

      msg.isFollowUp = isFollowUp
      msg.questionIndex = questionIndex
      if (typeof totalQuestionCount === 'number' && totalQuestionCount > 0) {
        this.totalQuestionCount = totalQuestionCount
      }

      if (isFollowUp) {
        this.followUpCount += 1
      } else {
        this.questionCount = questionIndex
        this.followUpCount = 0
      }

      void this.persist()
    },

    finishInterview() {
      this.status = 'finished'
      void this.persist()
    },

    setReport(report) {
      this.report = report
      void this.persist()
    },

    async reset() {
      this.$patch({
        ...getDefaultState(),
        loading: false,
      })
      await clearInterviewState()
    },

    clearLocalState() {
      this.$patch({
        ...getDefaultState(),
        loading: false,
      })
    },
  },
})
