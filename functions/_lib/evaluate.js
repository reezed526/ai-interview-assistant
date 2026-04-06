import OpenAI from 'openai'

export function createDeepSeekClient(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  })
}

export function buildEvaluatorPrompt(jobType, jobDescription) {
  return `你是一位资深中文面试评估专家。请根据以下按“主问题”整理后的面试记录，对候选人的表现进行评估。

## 候选人应聘岗位
岗位类型：${jobType}
岗位 JD：${jobDescription?.trim() || '（未提供）'}

## 评估维度
每项 0 到 100 分：
1. logic：逻辑性，论证是否清晰、因果是否成立
2. completeness：完整性，回答是否覆盖了问题关键点
3. depth：专业深度，是否体现岗位所需的方法、判断和经验
4. expression：表达能力，语言是否清楚、结构是否明确
5. relevance：岗位匹配度，回答内容与目标岗位要求的贴合程度

## 逐题评估要求
- 下面提供的每一题都已经按主问题聚合
- 每个主问题下可能包含追问信息和候选人的多轮回答
- 你需要基于整个主问题的完整表现来评分
- 不要把追问单独当成新的题目评分

## questionReviews 输出要求
对每个主问题输出：
- question：主问题原题
- userAnswer：候选人回答摘要，控制在 50 字以内
- score：该主问题得分，0 到 100
- feedback：指出回答中最关键的问题，要具体
- betterDirection：给出更好的回答方向，要能落地

## 输出格式
严格只输出 JSON，不要输出任何额外说明：
{
  "totalScore": number,
  "dimensions": {
    "logic": number,
    "completeness": number,
    "depth": number,
    "expression": number,
    "relevance": number
  },
  "questionReviews": [
    {
      "question": "string",
      "userAnswer": "string",
      "score": number,
      "feedback": "string",
      "betterDirection": "string"
    }
  ],
  "overallSuggestion": "string"
}`
}

export function extractJSON(raw) {
  const str = raw.trim()
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) {
    return JSON.parse(codeBlock[1].trim())
  }
  return JSON.parse(str)
}

export function groupConversationByMainQuestion(conversation) {
  const normalized = conversation
    .filter((message) => typeof message?.content === 'string' && message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
      questionIndex: message.questionIndex ?? null,
      isFollowUp: Boolean(message.isFollowUp),
    }))

  const groups = []
  let current = null

  for (const message of normalized) {
    if (message.role === 'assistant' && !message.isFollowUp) {
      current = {
        questionIndex: message.questionIndex ?? groups.length + 1,
        question: message.content,
        followUps: [],
        answers: [],
      }
      groups.push(current)
      continue
    }

    if (!current) continue

    if (message.role === 'assistant' && message.isFollowUp) {
      current.followUps.push(message.content)
      continue
    }

    if (message.role === 'user') {
      current.answers.push(message.content)
    }
  }

  return groups.filter((group) => group.question && group.answers.length > 0)
}

export function buildGroupedConversationText(groups) {
  return groups
    .map((group, index) => {
      const followUpText = group.followUps.length
        ? `追问：\n${group.followUps.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
        : '追问：无'

      const answersText = group.answers.map((item, i) => `${i + 1}. ${item}`).join('\n')

      return `主问题 ${index + 1}：
问题：${group.question}
${followUpText}
候选人回答：
${answersText}`
    })
    .join('\n\n')
}
