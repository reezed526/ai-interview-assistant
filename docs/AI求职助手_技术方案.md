# AI 求职助手 - 技术方案与开发指南

## 一、项目概述

AI求职助手是一款帮助应届生模拟面试的Web产品。用户选择目标岗位后，AI扮演面试官进行多轮对话式面试（含追问），面试结束后给出多维度评分和逐题反馈。

### MVP 核心功能（只做这些）
1. **首页**：选择岗位类型 + 输入/粘贴JD
2. **面试房间**：AI面试官对话（出题→用户回答→AI追问→循环→下一题）
3. **面试报告**：总分 + 五维雷达图 + 逐题点评 + 改进建议
4. **错题本**：自动归档答错题目，支持查看历史

### 不做的功能（后续迭代）
- 语音输入
- 简历解析
- 经历挖掘
- 知识图谱
- 用户注册登录（MVP用本地存储）

---

## 二、技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | Vue 3 + Vite | 用户熟悉Vue，Composition API |
| 样式方案 | TailwindCSS | 快速开发，响应式 |
| 路由 | Vue Router 4 | SPA路由 |
| 状态管理 | Pinia | 轻量，存面试状态 |
| 本地存储 | localStorage | 错题本、历史记录 |
| AI接口 | DeepSeek API (deepseek-chat / V3.2) | 兼容OpenAI格式，中文能力强，成本极低 |
| 中间层 | Vercel Serverless Functions (Node.js) | API代理+Prompt组装 |
| 部署 | 腾讯云 EdgeOne Pages / 阿里云等类似服务 | 国内访问速度快，支持自动构建部署 |
| 图表 | Chart.js 或 ECharts | 雷达图评分展示 |

> **为什么选DeepSeek而非Claude/GPT？**
> 1. **中文能力**：训练数据中文语料占比高，面试追问和反馈的中文表达更自然
> 2. **成本**：每百万token输入$0.28/输出$0.42，约为Claude Sonnet的1/10
> 3. **可用性**：国内直接访问，无需科学上网，部署后用户也能正常使用
> 4. **兼容性**：API格式完全兼容OpenAI，教程和生态丰富
> 5. **免费额度**：新注册送500万token，开发测试阶段基本零成本

---

## 三、项目结构

```
ai-interview-assistant/
├── docs/                    # 项目文档（给Claude Code读的）
│   └── 技术方案.md              # 这份技术方案文档
├── public/
├── src/
│   ├── assets/              # 静态资源
│   ├── components/          # 通用组件
│   │   ├── ChatBubble.vue       # 单条消息气泡
│   │   ├── ChatInput.vue        # 输入框+发送按钮
│   │   ├── RadarChart.vue       # 五维雷达图
│   │   ├── ScoreCard.vue        # 单题评分卡片
│   │   └── LoadingDots.vue      # AI思考中动画
│   ├── views/               # 页面
│   │   ├── HomePage.vue         # 首页：选岗位+输入JD
│   │   ├── InterviewRoom.vue    # 面试房间：对话界面
│   │   ├── ReportPage.vue       # 面试报告
│   │   └── NotebookPage.vue     # 错题本
│   ├── stores/              # Pinia状态
│   │   ├── interview.js         # 面试状态（当前问题、对话历史、状态）
│   │   └── notebook.js          # 错题本状态
│   ├── services/            # API调用
│   │   └── api.js               # 封装后端API调用
│   ├── prompts/             # Prompt模板（前端存一份参考）
│   │   └── interviewer.js       # 面试官System Prompt
│   ├── router/
│   │   └── index.js
│   ├── App.vue
│   └── main.js
├── api/                     # Vercel Serverless Functions
│   ├── chat.js                  # 面试对话接口（流式）
│   └── evaluate.js              # 面试评分接口
├── vercel.json
├── package.json
├── tailwind.config.js
├── vite.config.js
└── .env.local               # DEEPSEEK_API_KEY（不提交git）
```

---

## 四、核心页面设计

### 4.1 首页 (HomePage.vue)

**功能：**
- 标题和产品介绍
- 岗位类型选择（产品经理/技术研发/销售/职能，用卡片式选择）
- JD输入框（textarea，支持粘贴）
- "开始面试"按钮

**数据流：**
```
用户选择岗位 + 输入JD → 存入Pinia store → 跳转 /interview
```

### 4.2 面试房间 (InterviewRoom.vue)

**功能：**
- 顶部：当前岗位信息 + 题号进度（如 "第2题/共6题"）+ 结束面试按钮
- 中部：对话消息列表（左侧AI气泡，右侧用户气泡）
- 底部：文字输入框 + 发送按钮
- AI回复时显示"面试官正在思考..."的打字动画
- 支持流式输出（SSE），AI回复逐字显示

**核心逻辑：**
```
页面加载 → 调用API生成第一个问题
用户输入回答 → 发送到API → AI判断是追问还是下一题
  → 如果是追问：继续当前话题
  → 如果已追问2-3轮：生成下一个新问题
  → 如果已完成5-8个主问题：面试结束，跳转报告页
```

**消息数据结构：**
```javascript
{
  id: 'msg_001',
  role: 'assistant',  // 'assistant' | 'user'
  content: '请介绍一下你最有成就感的一个项目...',
  timestamp: Date.now(),
  questionIndex: 1,    // 第几个主问题
  isFollowUp: false,   // 是否是追问
}
```

### 4.3 面试报告 (ReportPage.vue)

**功能：**
- 总分展示（百分制，大数字）
- 五维雷达图（逻辑性/完整性/专业深度/表达力/岗位匹配度）
- 逐题评价列表：
  - 原题 + 用户回答摘要
  - AI点评："你的回答偏在哪里" + "更好的回答方向"
  - 单题得分
- "保存到错题本"按钮（标记答得不好的题）
- "再来一次"按钮

### 4.4 错题本 (NotebookPage.vue)

**功能：**
- 错题列表（按时间倒序）
- 每道题展示：题目 + 用户回答 + AI点评 + 日期
- 可删除
- 数据存在 localStorage

---

## 五、API设计

### 5.1 面试对话接口

**路径：** `POST /api/chat`

**请求：**
```json
{
  "jobType": "产品经理",
  "jobDescription": "负责用户增长...",
  "messages": [
    { "role": "assistant", "content": "请介绍一下..." },
    { "role": "user", "content": "我在实习中..." }
  ],
  "questionCount": 2,
  "followUpCount": 1
}
```

**响应：** Server-Sent Events (SSE) 流式输出

**后端逻辑 (api/chat.js)：**
```javascript
// 1. 接收前端参数
// 2. 组装System Prompt（见第六节）
// 3. 调用DeepSeek API（兼容OpenAI格式）
//    - base_url: https://api.deepseek.com
//    - model: deepseek-chat
//    - 开启stream: true
// 4. 将stream转发给前端（SSE）

// 示例代码：
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const stream = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
  ],
  stream: true,
});
```

### 5.2 面试评分接口

**路径：** `POST /api/evaluate`

**请求：**
```json
{
  "jobType": "产品经理",
  "jobDescription": "...",
  "conversation": [ /* 完整对话记录 */ ]
}
```

**响应：**
```json
{
  "totalScore": 78,
  "dimensions": {
    "logic": 80,
    "completeness": 75,
    "depth": 70,
    "expression": 82,
    "relevance": 83
  },
  "questionReviews": [
    {
      "question": "请介绍一下...",
      "userAnswer": "...",
      "score": 75,
      "feedback": "你的回答提到了项目背景，但缺少具体的数据支撑...",
      "betterDirection": "建议使用STAR法则，补充量化的结果..."
    }
  ],
  "overallSuggestion": "整体表现不错，建议加强..."
}
```

---

## 六、核心Prompt设计（最重要的部分）

### 6.1 面试官System Prompt

> **Prompt设计说明**：以下Prompt已针对DeepSeek的中文理解能力优化。
> DeepSeek对中文指令的遵循度很好，但建议在测试时关注：
> 1. 追问是否足够自然（不会过于模板化）
> 2. 是否能正确判断"何时追问vs何时下一题"
> 3. 结束面试的触发是否准确
> 如果效果不理想，可以在system prompt中增加few-shot示例。

```
你是一位经验丰富的面试官，正在面试一位应聘「{{jobType}}」岗位的候选人。

## 岗位JD
{{jobDescription}}

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
在最后一次回复时，以"好的，今天的面试就到这里"开头来结束面试。
```

### 6.2 评分System Prompt

```
你是一位资深面试评估专家。请根据以下面试对话记录，对候选人的表现进行评估。

## 候选人应聘的岗位
类型：{{jobType}}
JD：{{jobDescription}}

## 评估维度（每项0-100分）
1. 逻辑性(logic)：论证是否有条理，因果关系是否清晰
2. 完整性(completeness)：回答是否覆盖了问题的各个方面
3. 专业深度(depth)：是否展现了岗位所需的专业知识和思考
4. 表达力(expression)：语言组织是否清晰流畅，是否有结构感
5. 岗位匹配度(relevance)：回答内容与岗位要求的契合程度

## 逐题评价要求
对每个主问题（不含追问）给出：
- score：该题得分(0-100)
- feedback：指出回答中的具体问题，说"偏在哪里"
- betterDirection：给出"更好的回答应该往什么方向走"的具体建议

## 输出格式
严格按以下JSON格式输出，不要输出其他任何内容：
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
}
```

---

## 七、开发顺序（建议按这个步骤来）

### Step 1：项目初始化（30分钟）
```bash
npm create vite@latest ai-interview -- --template vue
cd ai-interview
npm install vue-router@4 pinia tailwindcss @tailwindcss/vite
npm install echarts  # 或 chart.js
npm install openai   # DeepSeek兼容OpenAI SDK
```

### Step 2：搭建页面骨架（2-3小时）
- 配置Vue Router（4个页面路由）
- 配置TailwindCSS
- 写出4个页面的基本结构（先不接API）
- 搭建整体布局和导航

### Step 3：实现首页（1-2小时）
- 岗位卡片选择组件
- JD输入框
- 数据存入Pinia

### Step 4：实现面试对话页（重点，4-6小时）
- ChatBubble组件
- ChatInput组件
- 消息列表的自动滚动
- 对接API的流式输出（SSE）
- AI"思考中"的加载动画

### Step 5：实现后端API（3-4小时）
- api/chat.js：接收参数→组装Prompt→调DeepSeek API→流式返回
- api/evaluate.js：接收完整对话→调DeepSeek API→返回评分JSON
- 本地开发可以先用Vite的proxy或直接本地Node脚本测试
- **注意**：DeepSeek API兼容OpenAI SDK，安装 `openai` 包即可，改一下baseURL

### Step 6：实现报告页（2-3小时）
- 雷达图组件（ECharts）
- 总分展示
- 逐题评价卡片列表

### Step 7：实现错题本（1-2小时）
- localStorage读写
- 错题列表页

### Step 8：联调和优化（2-3小时）
- 全流程测试
- 响应式适配（手机端）
- 加载状态、错误处理、空状态

### Step 9：部署到国内平台（最推荐，1-2小时）
- 推荐平台：腾讯云 EdgeOne Pages 或阿里云等类似静态站点/边缘托管服务
- 连接GitHub仓库
- 配置环境变量（DEEPSEEK_API_KEY）
- 部署上线
- 如果使用国内节点并绑定正式域名，按平台要求完成ICP备案

**说明：**
- 这是对国内用户最稳定、最彻底的方案，国内访问速度和稳定性都会明显优于海外平台
- 这些平台同样支持 Git 自动构建部署，后续只需 `git push`，平台就会自动重新构建并上线

---

## 八、给Claude Code的使用建议

当你在Claude Code中开发时，建议这样下指令：

### 初始化时：
"请阅读这份技术方案文档，然后帮我初始化Vue 3 + Vite + TailwindCSS + Vue Router + Pinia项目，按照文档中的项目结构创建好文件目录。"

### 逐步开发时：
"现在请实现首页 HomePage.vue，功能是：岗位类型卡片选择（产品经理/技术研发/销售/职能）+ JD文本框输入 + 开始面试按钮。选择结果存入Pinia的interview store。样式用TailwindCSS，设计要简洁专业。"

### 关键原则：
1. 一次只让Claude Code做一个页面或一个功能
2. 每做完一个功能，自己跑一下看看效果，确认没问题再继续
3. 把这份文档放在项目根目录，让Claude Code可以随时参考
