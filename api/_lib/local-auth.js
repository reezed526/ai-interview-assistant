import fs from 'node:fs/promises'
import path from 'node:path'
import {
  AUTH_COOKIE_NAME,
  buildExpiredSessionCookie,
  buildSessionCookie,
  createPasswordSalt,
  createSessionToken,
  createUserId,
  fingerprintPassword,
  normalizeEmail,
  parseCookieHeader,
  sanitizeUser,
  validateLoginInput,
  validateRegistrationInput,
  verifySessionToken,
} from '../../shared/auth.js'

const DATA_DIR = path.resolve(process.cwd(), '.data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-auth-secret-change-me'

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(USERS_FILE)
  } catch {
    await fs.writeFile(USERS_FILE, '[]', 'utf8')
  }
}

async function readUsers() {
  await ensureDataFile()
  const raw = await fs.readFile(USERS_FILE, 'utf8')
  return JSON.parse(raw)
}

async function writeUsers(users) {
  await ensureDataFile()
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
}

function json(res, status, data, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value))
  return res.status(status).json(data)
}

function getSecureFlag(req) {
  const proto = req.headers['x-forwarded-proto']
  return proto === 'https'
}

export async function handleRegister(req, res) {
  const { name = '', email = '', password = '' } = req.body ?? {}
  const validationError = validateRegistrationInput({ name, email, password })
  if (validationError) {
    return json(res, 400, { error: validationError })
  }

  const normalizedEmail = normalizeEmail(email)
  const users = await readUsers()
  if (users.some((user) => user.email === normalizedEmail)) {
    return json(res, 409, { error: '该邮箱已注册' })
  }

  const userId = createUserId()
  const passwordSalt = createPasswordSalt()
  const passwordHash = await fingerprintPassword(password, passwordSalt)
  const createdAt = new Date().toISOString()

  users.push({
    id: userId,
    name: name.trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    created_at: createdAt,
  })

  await writeUsers(users)

  const token = await createSessionToken(userId, AUTH_SECRET)
  return json(
    res,
    201,
    { user: sanitizeUser({ id: userId, name: name.trim(), email: normalizedEmail, created_at: createdAt }) },
    { 'Set-Cookie': buildSessionCookie(token, { secure: getSecureFlag(req) }) },
  )
}

export async function handleLogin(req, res) {
  const { email = '', password = '' } = req.body ?? {}
  const validationError = validateLoginInput({ email, password })
  if (validationError) {
    return json(res, 400, { error: validationError })
  }

  const normalizedEmail = normalizeEmail(email)
  const users = await readUsers()
  const user = users.find((item) => item.email === normalizedEmail)

  if (!user) {
    return json(res, 401, { error: '邮箱或密码错误' })
  }

  const passwordHash = await fingerprintPassword(password, user.password_salt)
  if (passwordHash !== user.password_hash) {
    return json(res, 401, { error: '邮箱或密码错误' })
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
