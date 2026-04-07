const USERS_KEY = 'ai_interview_users'
const AUTH_SESSION_KEY = 'ai_interview_auth_session'

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function loadUsers() {
  return safeParse(localStorage.getItem(USERS_KEY), [])
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function loadAuthSession() {
  return safeParse(localStorage.getItem(AUTH_SESSION_KEY), null)
}

export function saveAuthSession(user) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

export function sanitizeUser(user) {
  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    createdAt: user.createdAt,
  }
}

export async function hashPassword(password) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(password)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  return password
}
