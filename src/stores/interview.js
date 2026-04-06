import { defineStore } from 'pinia'

const SESSION_KEY = 'ai_interview_session'

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(state) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      jobType:       state.jobType,
      jobDescription: state.jobDescription,
      messages:      state.messages,
      questionCount: state.questionCount,
      totalQuestionCount: state.totalQuestionCount,
      followUpCount: state.followUpCount,
      status:        state.status,
      report:        state.report,
    }))
  } catch { /* sessionStorage 不可用时静默失败 */ }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

const saved = loadSession()

export const useInterviewStore = defineStore('interview', {
  state: () => ({
    jobType:        saved?.jobType        ?? '',
    jobDescription: saved?.jobDescription ?? '',
    messages:       saved?.messages       ?? [],
    questionCount:  saved?.questionCount  ?? 0,
    totalQuestionCount: saved?.totalQuestionCount ?? 6,
    followUpCount:  saved?.followUpCount  ?? 0,
    status:         saved?.status         ?? 'idle',
    report:         saved?.report         ?? null,
  }),

  getters: {
    lastMessage: (state) => state.messages[state.messages.length - 1] ?? null,
    roundCount:  (state) => state.messages.filter((m) => m.role === 'user').length,
    currentQuestionIndex: (state) => {
      const assistantMessages = state.messages.filter((message) => message.role === 'assistant')
      return assistantMessages[assistantMessages.length - 1]?.questionIndex ?? Math.max(state.questionCount, 1)
    },
  },

  actions: {
    startInterview(jobType, jobDescription) {
      this.jobType        = jobType
      this.jobDescription = jobDescription
      this.messages       = []
      this.questionCount  = 0
      this.totalQuestionCount = 6
      this.followUpCount  = 0
      this.status         = 'in-progress'
      this.report         = null
      saveSession(this.$state)
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
      saveSession(this.$state)
      return id
    },

    appendToLastMessage(chunk) {
      const last = this.messages[this.messages.length - 1]
      if (last) {
        last.content += chunk
        // 流式输出期间不频繁写 sessionStorage，避免性能问题
      }
    },

    setStreamingDone(id) {
      const msg = this.messages.find((m) => m.id === id)
      if (msg) {
        msg.isStreaming = false
        saveSession(this.$state)   // 流结束后才持久化
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
        this.followUpCount++
      } else {
        this.questionCount = questionIndex
        this.followUpCount = 0
      }

      saveSession(this.$state)
    },

    finishInterview() {
      this.status = 'finished'
      saveSession(this.$state)
    },

    setReport(report) {
      this.report = report
      saveSession(this.$state)
    },

    reset() {
      this.$patch({
        jobType:        '',
        jobDescription: '',
        messages:       [],
        questionCount:  0,
        totalQuestionCount: 6,
        followUpCount:  0,
        status:         'idle',
        report:         null,
      })
      clearSession()
    },
  },
})
