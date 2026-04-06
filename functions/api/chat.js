import {
  buildSystemPrompt,
  chooseTotalQuestionCount,
  classifyNextAction,
  createDeepSeekClient,
} from '../_lib/chat.js'

export async function onRequestPost(context) {
  const apiKey = context.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'DEEPSEEK_API_KEY is not configured' }, { status: 500 })
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    jobType,
    jobDescription,
    messages,
    questionCount = 0,
    totalQuestionCount,
    followUpCount = 0,
  } = body ?? {}

  if (!jobType) {
    return Response.json({ error: 'jobType is required' }, { status: 400 })
  }

  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages must be an array' }, { status: 400 })
  }

  const client = createDeepSeekClient(apiKey)
  const resolvedTotalQuestionCount = totalQuestionCount ?? chooseTotalQuestionCount(jobDescription)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const write = (data) => controller.enqueue(encoder.encode(`data: ${data}\n\n`))

      try {
        const action = await classifyNextAction({
          client,
          jobType,
          jobDescription,
          messages,
          questionCount,
          followUpCount,
          totalQuestionCount: resolvedTotalQuestionCount,
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

        const completionStream = await client.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: buildSystemPrompt(jobType, jobDescription, action) },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 1024,
        })

        for await (const chunk of completionStream) {
          const text = chunk.choices?.[0]?.delta?.content
          if (text) {
            write(JSON.stringify({ choices: [{ delta: { content: text } }] }))
          }

          if (chunk.choices?.[0]?.finish_reason === 'stop') {
            break
          }
        }

        write('[DONE]')
      } catch (error) {
        write(JSON.stringify({ error: error.message }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
