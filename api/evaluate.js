import {
  buildEvaluatorPrompt,
  buildGroupedConversationText,
  createDeepSeekClient,
  extractJSON,
  groupConversationByMainQuestion,
} from '../functions/_lib/evaluate.js'

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('[api/evaluate] DEEPSEEK_API_KEY is missing. Check .env.local.')
}

const client = createDeepSeekClient(process.env.DEEPSEEK_API_KEY ?? 'missing')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { jobType, jobDescription, conversation } = req.body ?? {}

  if (!jobType) {
    return res.status(400).json({ error: 'jobType is required' })
  }

  if (!Array.isArray(conversation) || conversation.length === 0) {
    return res.status(400).json({ error: 'conversation must be a non-empty array' })
  }

  const groupedConversation = groupConversationByMainQuestion(conversation)
  if (groupedConversation.length === 0) {
    return res.status(400).json({ error: 'conversation does not contain any complete main-question records' })
  }

  const conversationText = buildGroupedConversationText(groupedConversation)

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildEvaluatorPrompt(jobType, jobDescription) },
        {
          role: 'user',
          content: `以下是按主问题整理后的面试记录，请按要求输出评估 JSON：\n\n${conversationText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2048,
    })

    const raw = completion.choices[0].message.content ?? ''
    let result

    try {
      result = extractJSON(raw)
    } catch (parseError) {
      console.error('[evaluate] JSON parse failed:', parseError.message, 'raw:', raw.slice(0, 200))
      return res.status(502).json({
        error: parseError.message === 'AI returned empty content' ? 'AI returned empty content' : 'AI returned invalid JSON',
        raw: raw.slice(0, 500),
      })
    }

    result.totalScore ??= 0
    result.dimensions ??= { logic: 0, completeness: 0, depth: 0, expression: 0, relevance: 0 }
    result.questionReviews ??= []
    result.overallSuggestion ??= ''

    return res.status(200).json(result)
  } catch (error) {
    console.error('[api/evaluate error]', error)
    return res.status(502).json({ error: 'AI service unavailable', detail: error.message })
  }
}
