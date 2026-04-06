export const AUTH_COOKIE_NAME = 'ai_auth_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

const encoder = new TextEncoder()

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Bytes(input) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return new Uint8Array(digest)
}

async function hmacSha256Bytes(secret, input) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input))
  return new Uint8Array(signature)
}

function normalizeSecureValue(isSecure) {
  return Boolean(isSecure)
}

export function parseCookieHeader(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf('=')
      if (index === -1) return acc
      const key = part.slice(0, index).trim()
      const value = part.slice(index + 1).trim()
      acc[key] = decodeURIComponent(value)
      return acc
    }, {})
}

export function buildSessionCookie(token, { maxAge = SESSION_TTL_SECONDS, secure = true } = {}) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ]

  if (normalizeSecureValue(secure)) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function buildExpiredSessionCookie({ secure = true } = {}) {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]

  if (normalizeSecureValue(secure)) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function isSecureRequest(url) {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function validateRegistrationInput({ name, email, password }) {
  if (!name?.trim()) return '请输入昵称'
  if (!email?.trim()) return '请输入邮箱'
  if (!/^\S+@\S+\.\S+$/.test(email)) return '邮箱格式不正确'
  if (!password || password.length < 6) return '密码至少需要 6 位'
  return ''
}

export function validateLoginInput({ email, password }) {
  if (!email?.trim()) return '请输入邮箱'
  if (!password) return '请输入密码'
  return ''
}

export function createUserId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return `user_${bytesToHex(bytes)}`
}

export function createPasswordSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bytesToHex(bytes)
}

export async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256,
  )

  return bytesToHex(new Uint8Array(derived))
}

export async function createSessionToken(userId, secret, ttlSeconds = SESSION_TTL_SECONDS) {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const payload = `${userId}.${expiresAt}`
  const signature = bytesToHex(await hmacSha256Bytes(secret, payload))
  return `${payload}.${signature}`
}

export async function verifySessionToken(token, secret) {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [userId, expiresAtRaw, signature] = parts
  const expiresAt = Number(expiresAtRaw)

  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null
  }

  const payload = `${userId}.${expiresAt}`
  const expectedSignature = bytesToHex(await hmacSha256Bytes(secret, payload))

  if (expectedSignature !== signature) {
    return null
  }

  return {
    userId,
    expiresAt,
  }
}

export function sanitizeUser(user) {
  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at ?? user.createdAt ?? null,
  }
}

export async function fingerprintPassword(password, salt) {
  return hashPassword(password, salt)
}
