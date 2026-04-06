/**
 * 发送面试对话消息，通过 SSE 流式接收 AI 回复。
 *
 * @param {Object}   params
 * @param {string}   params.jobType
 * @param {string}   params.jobDescription
 * @param {Array}    params.messages          - 历史消息（不含本次 AI 占位气泡）
 * @param {number}   params.questionCount
 * @param {number}   params.totalQuestionCount
 * @param {number}   params.followUpCount
 * @param {function} params.onChunk           - 每收到一段文字调用一次
 * @returns {Promise<{ action: string, questionIndex: number } | null>}
 */
export async function sendChatMessage({
  jobType,
  jobDescription,
  messages,
  questionCount,
  totalQuestionCount,
  followUpCount,
  onChunk,
}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType, jobDescription, messages, questionCount, totalQuestionCount, followUpCount }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    throw new Error(err.error ?? `API error: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  // 跨 chunk 的不完整行需要缓冲，否则会漏掉内容
  let lineBuffer = ''
  let meta = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })

    // 按换行切割；最后一段可能不完整，留到下次
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return meta

      try {
        const parsed = JSON.parse(payload)
        if (parsed.meta) {
          meta = parsed.meta
          continue
        }
        // 错误帧
        if (parsed.error) throw new Error(parsed.error)
        // 内容帧
        const text = parsed.choices?.[0]?.delta?.content
        if (text) onChunk(text)
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') {
          throw e // 真实错误向上抛
        }
        // 极少数情况：JSON 被截断，忽略此帧
      }
    }
  }

  return meta
}

/**
 * 提交完整对话，获取 AI 评分报告。
 *
 * @param {Object} params
 * @param {string} params.jobType
 * @param {string} params.jobDescription
 * @param {Array}  params.conversation   - 完整消息数组 [{role, content}, ...]
 * @returns {Promise<Object>}            - 评分 JSON
 */
export async function evaluateInterview({ jobType, jobDescription, conversation }) {
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType, jobDescription, conversation }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    throw new Error(err.error ?? `API error: ${response.status}`)
  }

  return response.json()
}
