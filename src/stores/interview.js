import { defineStore } from 'pinia'

export const useInterviewStore = defineStore('interview', {
  state: () => ({
    jobType: '',
    jobDescription: '',
    messages: [],       // { id, role, content, timestamp, isStreaming }
    questionCount: 0,   // 已出主问题数（用于传给 API）
    followUpCount: 0,   // 当前主问题下的追问数
    status: 'idle',     // 'idle' | 'in-progress' | 'finished'
    report: null,
  }),

  getters: {
    lastMessage: (state) => state.messages[state.messages.length - 1] ?? null,
    roundCount: (state) => state.messages.filter((m) => m.role === 'user').length,
  },

  actions: {
    startInterview(jobType, jobDescription) {
      this.jobType = jobType
      this.jobDescription = jobDescription
      this.messages = []
      this.questionCount = 0
      this.followUpCount = 0
      this.status = 'in-progress'
      this.report = null
    },

    /** 新增一条消息，返回其 id */
    addMessage(message) {
      const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      this.messages.push({
        id,
        timestamp: Date.now(),
        isStreaming: false,
        ...message,
      })
      return id
    },

    /** 流式输出：向最后一条消息追加内容片段 */
    appendToLastMessage(chunk) {
      const last = this.messages[this.messages.length - 1]
      if (last) last.content += chunk
    },

    /** 标记某条消息流式输出结束 */
    setStreamingDone(id) {
      const msg = this.messages.find((m) => m.id === id)
      if (msg) msg.isStreaming = false
    },

    /** 每次用户回答后更新计数 */
    incrementRound(isFollowUp = false) {
      if (isFollowUp) {
        this.followUpCount++
      } else {
        this.questionCount++
        this.followUpCount = 0
      }
    },

    finishInterview() {
      this.status = 'finished'
    },

    setReport(report) {
      this.report = report
    },

    reset() {
      this.$patch({
        jobType: '',
        jobDescription: '',
        messages: [],
        questionCount: 0,
        followUpCount: 0,
        status: 'idle',
        report: null,
      })
    },
  },
})
