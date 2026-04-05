import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

function buildEvaluatorPrompt(jobType, jobDescription) {
  return `你是一位资深面试评估专家。请根据以下面试对话记录，对候选人的表现进行评估。

## 候选人应聘的岗位
类型：${jobType}
JD：${jobDescription?.trim() || '（未提供）'}

## 评估维度（每项0-100分）
1. 逻辑性(logic)：论证是否有条理，因果关系是否清晰
2. 完整性(completeness)：回答是否覆盖了问题的各个方面
3. 专业深度(depth)：是否展现了岗位所需的专业知识和思考
4. 表达力(expression)：语言组织是否清晰流畅，是否有结构感
5. 岗位匹配度(relevance)：回答内容与岗位要求的契合程度

## 逐题评价要求
对每个主问题（不含追问）给出：
- score：该题得分(0-100)
- feedback：指出回答中的具体问题，说明"答得不够好在哪里"
- betterDirection：给出"更好的回答应该往什么方向走"的具体建议

## 输出格式
严格按以下JSON格式输出，不要输出其他任何内容，不要加markdown代码块：
{
  "totalScore": 数字,
  "dimensions": {
    "logic": 数字,
    "completeness": 数字,
    "depth": 数字,
    "expression": 数字,
    "relevance": 数字
  },
  "questionReviews": [
    {
      "question": "面试官问的原题",
      "userAnswer": "用户回答的摘要（50字以内）",
      "score": 数字,
      "feedback": "具体点评",
      "betterDirection": "改进方向建议"
    }
  ],
  "overallSuggestion": "整体建议，100字以内"
}`
}

/** 从 AI 输出中提取 JSON，容忍 markdown 代码块包裹 */
function extractJSON(raw) {
  const str = raw.trim()
  // 去掉 ```json ... ``` 或 ``` ... ```
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) return JSON.parse(codeBlock[1].trim())
  return JSON.parse(str)
}

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

  const conversationText = conversation
    .map((m) => `${m.role === 'assistant' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildEvaluatorPrompt(jobType, jobDescription) },
        {
          role: 'user',
          content: `以下是完整的面试对话记录，请按要求输出评估JSON：\n\n${conversationText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,   // 评分用低温度保证稳定性
      max_tokens: 2048,
    })

    const raw = completion.choices[0].message.content
    let result

    try {
      result = extractJSON(raw)
    } catch {
      console.error('[evaluate] JSON parse failed, raw:', raw.slice(0, 200))
      return res.status(502).json({ error: 'AI returned invalid JSON', raw: raw.slice(0, 500) })
    }

    // 基础结构兜底：确保前端不会因字段缺失崩溃
    result.totalScore ??= 0
    result.dimensions ??= { logic: 0, completeness: 0, depth: 0, expression: 0, relevance: 0 }
    result.questionReviews ??= []
    result.overallSuggestion ??= ''

    return res.status(200).json(result)
  } catch (err) {
    console.error('[api/evaluate error]', err)
    return res.status(502).json({ error: 'AI service unavailable', detail: err.message })
  }
}
