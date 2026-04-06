import {
  buildEvaluatorPrompt,
  buildGroupedConversationText,
  createDeepSeekClient,
  extractJSON,
  groupConversationByMainQuestion,
} from '../_lib/evaluate.js'

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

  const { jobType, jobDescription, conversation } = body ?? {}

  if (!jobType) {
    return Response.json({ error: 'jobType is required' }, { status: 400 })
  }

  if (!Array.isArray(conversation) || conversation.length === 0) {
    return Response.json({ error: 'conversation must be a non-empty array' }, { status: 400 })
  }

  const groupedConversation = groupConversationByMainQuestion(conversation)
  if (groupedConversation.length === 0) {
    return Response.json({ error: 'conversation does not contain any complete main-question records' }, { status: 400 })
  }

  const conversationText = buildGroupedConversationText(groupedConversation)
  const client = createDeepSeekClient(apiKey)

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

    const raw = completion.choices[0].message.content
    let result

    try {
      result = extractJSON(raw)
    } catch {
      return Response.json({ error: 'AI returned invalid JSON', raw: raw.slice(0, 500) }, { status: 502 })
    }

    result.totalScore ??= 0
    result.dimensions ??= { logic: 0, completeness: 0, depth: 0, expression: 0, relevance: 0 }
    result.questionReviews ??= []
    result.overallSuggestion ??= ''

    return Response.json(result, { status: 200 })
  } catch (error) {
    return Response.json({ error: 'AI service unavailable', detail: error.message }, { status: 502 })
  }
}
