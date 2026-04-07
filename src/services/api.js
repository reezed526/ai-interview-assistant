export async function sendChatMessage({
  jobType,
  jobDescription,
  messages,
  questionCount,
  totalQuestionCount,
  followUpCount,
  interviewId,
  onChunk,
}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
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
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    const error = new Error(err.error ?? `API error: ${response.status}`)
    error.code = err.code
    error.usage = err.usage
    throw error
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let lineBuffer = ''
  let meta = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
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
        if (parsed.error) throw new Error(parsed.error)
        const text = parsed.choices?.[0]?.delta?.content
        if (text) onChunk(text)
      } catch (error) {
        if (error.message !== 'Unexpected end of JSON input') {
          throw error
        }
      }
    }
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
