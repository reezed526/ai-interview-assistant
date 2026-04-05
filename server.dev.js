/**
 * 本地 API 开发服务器
 * 模拟 Vercel Serverless Functions 的运行环境，用于本地调试
 *
 * 启动方式：
 *   node server.dev.js
 *
 * 然后另开终端运行：
 *   npm run dev
 *
 * Vite 已配置 proxy，/api/* 请求自动转发到本服务器（port 3001）
 */

import 'dotenv/config'   // 加载 .env.local（需安装 dotenv）
import http from 'node:http'
import chatHandler from './api/chat.js'
import evaluateHandler from './api/evaluate.js'

const PORT = 3001

// ── 解析请求体 ─────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) }
      catch (e) { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

// ── 轻量级 res 包装器（对齐 Vercel 的 res API）──────────
function makeRes(res) {
  const wrapper = {
    _status: 200,
    _headersSent: false,
    get headersSent() { return wrapper._headersSent },

    status(code) { wrapper._status = code; return wrapper },

    setHeader(k, v) { res.setHeader(k, v); return wrapper },

    json(data) {
      if (!wrapper._headersSent) {
        res.writeHead(wrapper._status, { 'Content-Type': 'application/json' })
        wrapper._headersSent = true
      }
      res.end(JSON.stringify(data))
      return wrapper
    },

    write(chunk) {
      if (!wrapper._headersSent) {
        res.writeHead(wrapper._status)
        wrapper._headersSent = true
      }
      res.write(chunk)
      return wrapper
    },

    end(data) {
      if (!wrapper._headersSent) {
        res.writeHead(wrapper._status)
        wrapper._headersSent = true
      }
      res.end(data)
      return wrapper
    },
  }
  return wrapper
}

// ── HTTP 服务器 ────────────────────────────────────────
const server = http.createServer(async (req, nativeRes) => {
  // CORS（Vite dev server 跨域）
  nativeRes.setHeader('Access-Control-Allow-Origin', '*')
  nativeRes.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  nativeRes.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    nativeRes.writeHead(204)
    nativeRes.end()
    return
  }

  const res = makeRes(nativeRes)
  const url = req.url?.split('?')[0]

  try {
    req.body = await readBody(req)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  try {
    if (url === '/api/chat') {
      await chatHandler(req, res)
    } else if (url === '/api/evaluate') {
      await evaluateHandler(req, res)
    } else {
      res.status(404).json({ error: `Unknown route: ${url}` })
    }
  } catch (err) {
    console.error('[server.dev] Unhandled error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', detail: err.message })
    }
  }
})

server.listen(PORT, () => {
  console.log(`\n  ✅  API Dev Server running at http://localhost:${PORT}`)
  console.log(`  →   /api/chat      POST  (SSE streaming)`)
  console.log(`  →   /api/evaluate  POST  (JSON response)`)
  console.log(`\n  Make sure .env.local has DEEPSEEK_API_KEY set.\n`)
})
