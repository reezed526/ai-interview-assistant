import OpenAI from 'openai'

export function createDeepSeekClient(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  })
}

export function buildSystemPrompt(jobType, jobDescription, action) {
  const actionDirective = {
    follow_up: '本轮必须基于候选人刚才的回答继续追问，不要切换到新题。',
    new_question: '本轮必须开启一个新的主问题，不要继续追问上一题。',
    end_interview: '本轮必须结束面试，并以“好的，今天的面试就到这里”开头收尾。',
  }[action]

  return `你是一位经验丰富的中文面试官，正在面试一位应聘“${jobType}”岗位的候选人。

## 岗位 JD
${jobDescription?.trim() || '（未提供 JD，请根据岗位类型提出通用但专业的面试问题）'}

## 当前回合要求
${actionDirective}

## 你的行为准则

### 出题规则
- 基于 JD 中的核心能力要求生成面试问题
- 问题类型覆盖：行为题、情景题、专业题
- 整场面试共 5 到 8 个主问题
- 难度循序渐进：前 2 题用于暖场，中间考察核心能力，最后 1 到 2 题可适度增加压力

### 追问规则
- 如果候选人的回答存在以下问题，优先追问而不是直接进入下一题：
  1. 回答模糊，只说做过，但没说清楚具体怎么做
  2. 逻辑跳跃，缺少关键推理或决策过程
  3. 缺少结果数据，没有量化指标或事实支撑
  4. 有可深挖的经历，但没有展开关键细节
- 每个主问题最多追问 2 到 3 轮
- 追问要自然，像真实面试官一样继续深挖，不要像清单问答

### 对话风格
- 语气专业、直接、友好
- 一次只问一个问题
- 对好的回答可以给一句简短肯定，然后继续提问
- 面试过程中不要给出完整评价或建议，评价统一留到最后报告页

### 输出格式
- 每次只输出面试官此轮要说的话
- 不要输出标签、解释、标题或元数据

### 结束判断
- 只有当主问题数量已达到要求，且当前最后一个主问题已经问得足够完整时，才结束面试
- 如果主问题数量已达到，但候选人最后一题回答仍然单薄，应该继续追问而不是立刻结束`
}

export function buildClassifierPrompt(jobType, jobDescription, questionCount, totalQuestionCount, followUpCount, messages) {
  const conversationText = messages
    .map((message) => `${message.role === 'assistant' ? '面试官' : '候选人'}：${message.content}`)
    .join('\n\n')

  return `你是一个面试流程控制器，需要判断下一轮面试官回复属于哪一种动作。

候选岗位：${jobType}
岗位 JD：${jobDescription?.trim() || '未提供'}
已完成主问题数：${questionCount}
目标主问题数：${totalQuestionCount}
当前题已追问轮数：${followUpCount}

可选动作只有三种：
- "follow_up"：继续追问当前主问题
- "new_question"：切换到一个新的主问题
- "end_interview"：结束整场面试

判断规则：
1. 如果候选人上一轮回答仍然模糊、缺少细节、缺少量化结果、逻辑断裂，优先选择 "follow_up"
2. 如果当前主问题已经追问 2 轮或以上，通常优先选择 "new_question"
3. 如果主问题数还没有达到目标主问题数，不能选择 "end_interview"
4. 即使已经达到目标主问题数，只要当前最后一题回答仍不够完整，也优先选择 "follow_up"
5. 只有在主问题数达到目标且最后一题已经得到充分回答时，才可以选择 "end_interview"
6. 只返回一个最合理的动作

面试对话：
${conversationText}

严格输出 JSON：
{
  "action": "follow_up" | "new_question" | "end_interview",
  "reason": "一句话说明原因"
}`
}

export function chooseTotalQuestionCount(jobDescription) {
  const length = jobDescription?.trim().length ?? 0
  if (length >= 500) return 8
  if (length >= 180) return 7
  return 6
}

export async function classifyNextAction({
  client,
  jobType,
  jobDescription,
  messages,
  questionCount,
  followUpCount,
  totalQuestionCount,
}) {
  if (messages.length === 0) {
    return 'new_question'
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() ?? ''
  const lastAnswerTooShort = lastUserMessage.length > 0 && lastUserMessage.length < 40

  if (questionCount >= totalQuestionCount) {
    if (followUpCount >= 2) {
      return 'end_interview'
    }
    if (lastAnswerTooShort) {
      return 'follow_up'
    }
  }

  if (followUpCount >= 2) {
    return questionCount >= totalQuestionCount ? 'end_interview' : 'new_question'
  }

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: buildClassifierPrompt(jobType, jobDescription, questionCount, totalQuestionCount, followUpCount, messages),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 120,
  })

  const raw = completion.choices[0].message.content?.trim() || '{}'

  try {
    const parsed = JSON.parse(raw)
    if (['follow_up', 'new_question', 'end_interview'].includes(parsed.action)) {
      if (questionCount < 5 && parsed.action === 'end_interview') return 'new_question'
      if (questionCount < totalQuestionCount && parsed.action === 'end_interview') return 'new_question'
      if (questionCount >= totalQuestionCount && parsed.action === 'new_question') {
        return followUpCount >= 2 ? 'end_interview' : 'follow_up'
      }
      return parsed.action
    }
  } catch {
    return 'new_question'
  }

  return 'new_question'
}
