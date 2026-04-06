import {
  buildSystemPrompt,
  chooseTotalQuestionCount,
  classifyNextAction,
  createDeepSeekClient,
} from '../functions/_lib/chat.js'

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('[api/chat] DEEPSEEK_API_KEY is missing. Check .env.local.')
}

const client = createDeepSeekClient(process.env.DEEPSEEK_API_KEY ?? 'missing')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    jobType,
    jobDescription,
    messages,
    questionCount = 0,
    totalQuestionCount,
    followUpCount = 0,
  } = req.body ?? {}

  if (!jobType) {
    return res.status(400).json({ error: 'jobType is required' })
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' })
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const write = (data) => res.write(`data: ${data}\n\n`)

  try {
    const resolvedTotalQuestionCount = totalQuestionCount ?? chooseTotalQuestionCount(jobDescription)
    const action = await classifyNextAction({
      client,
      jobType,
      jobDescription,
      messages,
      questionCount,
      totalQuestionCount: resolvedTotalQuestionCount,
      followUpCount,
    })

    const questionIndex = action === 'new_question'
      ? questionCount + 1
      : Math.max(questionCount, 1)

    write(JSON.stringify({
      meta: {
        action,
        questionIndex,
        totalQuestionCount: resolvedTotalQuestionCount,
      },
    }))

    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt(jobType, jobDescription, action) },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    })

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content
      if (text) {
        write(JSON.stringify({ choices: [{ delta: { content: text } }] }))
      }

      if (chunk.choices?.[0]?.finish_reason === 'stop') {
        break
      }
    }

    write('[DONE]')
    res.end()
  } catch (error) {
    console.error('[api/chat error]', error)

    if (!res.headersSent) {
      return res.status(502).json({ error: 'AI service unavailable', detail: error.message })
    }

    write(JSON.stringify({ error: error.message }))
    res.end()
  }
}
