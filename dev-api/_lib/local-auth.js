import fs from 'node:fs/promises'
import path from 'node:path'
import {
  AUTH_COOKIE_NAME,
  FREE_INTERVIEW_QUOTA,
  FREE_PLAN_CODE,
  buildExpiredSessionCookie,
  buildSessionCookie,
  createPasswordSalt,
  createSessionToken,
  createUserId,
  fingerprintPassword,
  hasUnlimitedInterviewAccess,
  normalizeUsername,
  parseCookieHeader,
  sanitizeUser,
  validateLoginInput,
  validateRegistrationInput,
  verifySessionToken,
} from '../../shared/auth.js'

const DATA_DIR = path.resolve(process.cwd(), '.data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const ATTEMPTS_FILE = path.join(DATA_DIR, 'interview-attempts.json')
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-auth-secret-change-me'

async function ensureFile(filePath, fallback) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(filePath)
  } catch {
    await fs.writeFile(filePath, fallback, 'utf8')
  }
}

async function readJson(filePath, fallback) {
  await ensureFile(filePath, JSON.stringify(fallback))
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function writeJson(filePath, data) {
  await ensureFile(filePath, JSON.stringify(data))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function readUsers() {
  return readJson(USERS_FILE, [])
}

async function writeUsers(users) {
  await writeJson(USERS_FILE, users)
}

async function readAttempts() {
  return readJson(ATTEMPTS_FILE, [])
}

async function writeAttempts(attempts) {
  await writeJson(ATTEMPTS_FILE, attempts)
}

function json(res, status, data, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value))
  return res.status(status).json(data)
}

function getSecureFlag(req) {
  const proto = req.headers['x-forwarded-proto']
  return proto === 'https'
}

function getLoginValue(user) {
  return normalizeUsername(user.username ?? user.email ?? '')
}

export async function requireAuthenticatedUser(req, res) {
  const cookies = parseCookieHeader(req.headers.cookie || '')
  const token = cookies[AUTH_COOKIE_NAME]
  const session = await verifySessionToken(token, AUTH_SECRET)

  if (!session) {
    json(res, 401, { error: 'Unauthorized' })
    return null
  }

  const users = await readUsers()
  const user = users.find((item) => item.id === session.userId)
  if (!user) {
    json(
      res,
      401,
      { error: 'Unauthorized' },
      { 'Set-Cookie': buildExpiredSessionCookie({ secure: getSecureFlag(req) }) },
    )
    return null
  }

  return { user, users }
}

export async function ensureInterviewQuota(req, res, interviewId) {
  const auth = await requireAuthenticatedUser(req, res)
  if (!auth) return null

  if (!interviewId) {
    json(res, 400, { error: 'interviewId is required' })
    return null
  }

  const attempts = await readAttempts()
  const existingAttempt = attempts.find((item) => item.id === interviewId && item.user_id === auth.user.id)

  if (!existingAttempt) {
    if (hasUnlimitedInterviewAccess(auth.user)) {
      return {
        user: auth.user,
        usage: sanitizeUser(auth.user),
      }
    }

    const quota = Number(auth.user.interview_quota ?? FREE_INTERVIEW_QUOTA)
    const used = Number(auth.user.interview_used ?? 0)
    const remaining = quota < 0 ? -1 : quota - used

    if (remaining <= 0) {
      json(res, 403, {
        error: '免费版面试次数已用完，当前最多可进行 3 次模拟。订阅计划即将上线。',
        code: 'INTERVIEW_QUOTA_EXCEEDED',
        usage: sanitizeUser(auth.user),
      })
      return null
    }

    auth.user.interview_used = used + 1
    await writeUsers(auth.users)

    attempts.push({
      id: interviewId,
      user_id: auth.user.id,
      status: 'started',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await writeAttempts(attempts)
  }

  return {
    user: auth.user,
    usage: sanitizeUser(auth.user),
  }
}

export async function handleRegister(req, res) {
  const { name = '', username = '', password = '' } = req.body ?? {}
  const validationError = validateRegistrationInput({ name, username, password })
  if (validationError) {
    return json(res, 400, { error: validationError })
  }

  const normalizedUsername = normalizeUsername(username)
  const users = await readUsers()
  if (users.some((user) => getLoginValue(user) === normalizedUsername)) {
    return json(res, 409, { error: '该用户名已注册', code: 'USERNAME_ALREADY_EXISTS' })
  }

  const userId = createUserId()
  const passwordSalt = createPasswordSalt()
  const passwordHash = await fingerprintPassword(password, passwordSalt)
  const createdAt = new Date().toISOString()

  const user = {
    id: userId,
    name: name.trim(),
    username: normalizedUsername,
    email: normalizedUsername,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    created_at: createdAt,
    subscription_plan: FREE_PLAN_CODE,
    interview_quota: FREE_INTERVIEW_QUOTA,
    interview_used: 0,
  }

  users.push(user)
  await writeUsers(users)

  const token = await createSessionToken(userId, AUTH_SECRET)
  return json(
    res,
    201,
    { user: sanitizeUser(user) },
    { 'Set-Cookie': buildSessionCookie(token, { secure: getSecureFlag(req) }) },
  )
}

export async function handleLogin(req, res) {
  const { username = '', password = '' } = req.body ?? {}
  const validationError = validateLoginInput({ username, password })
  if (validationError) {
    return json(res, 400, { error: validationError })
  }

  const normalizedUsername = normalizeUsername(username)
  const users = await readUsers()
  const user = users.find((item) => getLoginValue(item) === normalizedUsername)

  if (!user) {
    return json(res, 404, { error: '该用户名还没有注册', code: 'USER_NOT_FOUND' })
  }

  const passwordHash = await fingerprintPassword(password, user.password_salt)
  if (passwordHash !== user.password_hash) {
    return json(res, 401, { error: '用户名或密码错误', code: 'INVALID_PASSWORD' })
  }

  const token = await createSessionToken(user.id, AUTH_SECRET)
  return json(
    res,
    200,
    { user: sanitizeUser(user) },
    { 'Set-Cookie': buildSessionCookie(token, { secure: getSecureFlag(req) }) },
  )
}

export async function handleMe(req, res) {
  const cookies = parseCookieHeader(req.headers.cookie || '')
  const token = cookies[AUTH_COOKIE_NAME]
  const session = await verifySessionToken(token, AUTH_SECRET)

  if (!session) {
    return json(res, 200, { user: null })
  }

  const users = await readUsers()
  const user = users.find((item) => item.id === session.userId)
  if (!user) {
    return json(
      res,
      200,
      { user: null },
      { 'Set-Cookie': buildExpiredSessionCookie({ secure: getSecureFlag(req) }) },
    )
  }

  return json(res, 200, { user: sanitizeUser(user) })
}

export async function handleLogout(req, res) {
  return json(
    res,
    200,
    { ok: true },
    { 'Set-Cookie': buildExpiredSessionCookie({ secure: getSecureFlag(req) }) },
  )
}
