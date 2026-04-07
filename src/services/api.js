export async function sendChatMessage({
  jobType,
  jobDescription,
  messages,
  questionCount,
  totalQuestionCount,
  followUpCount,
  interviewId,
  onChunk,
  onMeta,
}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobType,
      jobDescription,
      messages,
      questionCount,
      totalQuestionCount,
      followUpCount,
      interviewId,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(async () => {
      const text = await response.text().catch(() => '')
      return { error: text || `HTTP ${response.status}` }
    })
    const error = new Error(err.error ?? `API error: ${response.status}`)
    error.code = err.code
    error.usage = err.usage
    error.detail = err.detail
    throw error
  }

  if (!response.body) {
    throw new Error('API returned an empty response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let lineBuffer = ''
  let meta = null

  const processLines = () => {
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return true

      try {
        const parsed = JSON.parse(payload)
        if (parsed.meta) {
          meta = parsed.meta
          onMeta?.(parsed.meta)
          continue
        }
        if (parsed.error) throw new Error(parsed.error)
        const text = parsed.choices?.[0]?.delta?.content
        if (text) onChunk(text)
      } catch (error) {
        if (error.message !== 'Unexpected end of JSON input') {
          throw error
        }
      }
    }

    return false
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
    if (processLines()) {
      return meta
    }
  }

  lineBuffer += decoder.decode()
  if (processLines()) {
    return meta
  }

  return meta
}

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
