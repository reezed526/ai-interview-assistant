import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

function buildSystemPrompt(jobType, jobDescription) {
  return `你是一位经验丰富的面试官，正在面试一位应聘「${jobType}」岗位的候选人。

## 岗位JD
${jobDescription?.trim() || '（未提供JD，请根据岗位类型出通用面试题）'}

## 你的行为准则

### 出题规则
- 基于JD中的核心能力要求生成面试问题
- 问题类型覆盖：行为题（用STAR法则评估）、情景题、专业题
- 每场面试出5-8个主问题
- 难度循序渐进：前2题为暖场题，中间为核心能力考察，最后1-2题为压力题

### 追问规则（关键差异化）
- 当用户的回答存在以下情况时，必须追问而非跳到下一题：
  1. 回答模糊：提到"做了优化"但没说具体怎么优化的
  2. 逻辑断裂：从A直接跳到C，缺少B的推理过程
  3. 缺少数据：只说"效果很好"但没有量化指标
  4. 可以深挖：提到了一个有趣的经历但没展开
- 每个主问题最多追问2-3轮
- 追问要自然，像真实面试官一样，例如：
  "你刚才提到做了用户调研，能具体说说样本量是多少、怎么筛选用户的吗？"
  "如果当时资源只有一半，你会砍掉哪个功能？为什么？"

### 对话风格
- 语气专业但不冷漠，像一个认真但友善的面试官
- 不要一次性问多个问题，每次只问一个
- 对用户的好回答给予简短肯定，然后继续
- 不要在面试过程中给出评价或建议（评价在最后统一给出）

### 输出格式
每次回复只输出面试官说的话，不要加任何标注、标签或元数据。
直接以面试官的口吻说话。

### 结束判断
当你认为已经问了足够的问题（5-8个主问题，含追问共约15-20轮对话），
在最后一次回复时，以"好的，今天的面试就到这里"开头来结束面试。`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { jobType, jobDescription, messages } = req.body ?? {}

  if (!jobType) {
    return res.status(400).json({ error: 'jobType is required' })
  }
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' })
  }

  // SSE 必要头部
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // 禁止 nginx 缓冲，保证实时推送

  const write = (data) => res.write(`data: ${data}\n\n`)

  try {
    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt(jobType, jobDescription) },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    })

    for await (const chunk of stream) {
      // 正常内容块
      const text = chunk.choices?.[0]?.delta?.content
      if (text) {
        write(JSON.stringify({ choices: [{ delta: { content: text } }] }))
      }
      // 流结束标志
      if (chunk.choices?.[0]?.finish_reason === 'stop') {
        break
      }
    }

    write('[DONE]')
    res.end()
  } catch (err) {
    console.error('[api/chat error]', err)
    // 如果响应还没开始写，返回 JSON 错误
    if (!res.headersSent) {
      return res.status(502).json({ error: 'AI service unavailable', detail: err.message })
    }
    // 已经开始 SSE，通过 data 通知前端
    write(JSON.stringify({ error: err.message }))
    res.end()
  }
}
