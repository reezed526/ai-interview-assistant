/**
 * Local API dev server.
 * It mimics the Vercel Serverless Functions runtime for local debugging.
 */

import http from 'node:http'
import chatHandler from './api/chat.js'
import evaluateHandler from './api/evaluate.js'
import authRegisterHandler from './api/auth/register.js'
import authLoginHandler from './api/auth/login.js'
import authMeHandler from './api/auth/me.js'
import authLogoutHandler from './api/auth/logout.js'

const PORT = 3001

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.warn('[server.dev] Ignoring inherited NODE_TLS_REJECT_UNAUTHORIZED=0 and restoring default TLS verification.')
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

function makeRes(res) {
  const wrapper = {
    _status: 200,
    _headersSent: false,
    get headersSent() {
      return wrapper._headersSent
    },
    status(code) {
      wrapper._status = code
      return wrapper
    },
    setHeader(key, value) {
      res.setHeader(key, value)
      return wrapper
    },
    json(data) {
      if (!wrapper._headersSent) {
        res.writeHead(wrapper._status, { 'Content-Type': 'application/json; charset=utf-8' })
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

const server = http.createServer(async (req, nativeRes) => {
  nativeRes.setHeader('Access-Control-Allow-Origin', '*')
  nativeRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  nativeRes.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    nativeRes.writeHead(204)
    nativeRes.end()
    return
  }

  const res = makeRes(nativeRes)
  const url = req.url?.split('?')[0]

  if (req.method !== 'GET') {
    try {
      req.body = await readBody(req)
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  } else {
    req.body = {}
  }

  try {
    if (url === '/api/chat') {
      await chatHandler(req, res)
      return
    }

    if (url === '/api/evaluate') {
      await evaluateHandler(req, res)
      return
    }

    if (url === '/api/auth/register') {
      await authRegisterHandler(req, res)
      return
    }

    if (url === '/api/auth/login') {
      await authLoginHandler(req, res)
      return
    }

    if (url === '/api/auth/me') {
      await authMeHandler(req, res)
      return
    }

    if (url === '/api/auth/logout') {
      await authLogoutHandler(req, res)
      return
    }

    return res.status(404).json({ error: `Unknown route: ${url}` })
  } catch (error) {
    console.error('[server.dev] Unhandled error:', error)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', detail: error.message })
    }
    res.end()
  }
})

server.listen(PORT, () => {
  console.log(`API Dev Server running at http://localhost:${PORT}`)
  console.log('GET  /api/auth/me')
  console.log('POST /api/auth/register')
  console.log('POST /api/auth/login')
  console.log('POST /api/auth/logout')
  console.log('POST /api/chat')
  console.log('POST /api/evaluate')
  console.log('Make sure .env.local has DEEPSEEK_API_KEY set.')
})
