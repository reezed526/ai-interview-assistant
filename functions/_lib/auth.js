import {
  AUTH_COOKIE_NAME,
  buildExpiredSessionCookie,
  buildSessionCookie,
  createPasswordSalt,
  createSessionToken,
  createUserId,
  fingerprintPassword,
  isSecureRequest,
  normalizeEmail,
  parseCookieHeader,
  sanitizeUser,
  validateLoginInput,
  validateRegistrationInput,
  verifySessionToken,
} from '../../shared/auth.js'

function json(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  })
}

function getSecureCookieFlag(request) {
  return isSecureRequest(request.url)
}

async function getUserByEmail(db, email) {
  return db
    .prepare('SELECT id, name, email, password_hash, password_salt, created_at FROM users WHERE email = ?')
    .bind(email)
    .first()
}

async function getUserById(db, userId) {
  return db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .bind(userId)
    .first()
}

export async function handleRegister(context) {
  const db = context.env.DB
  const authSecret = context.env.AUTH_SECRET

  if (!db || !authSecret) {
    return json({ error: 'DB or AUTH_SECRET is not configured' }, { status: 500 })
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name = '', email = '', password = '' } = body ?? {}
  const validationError = validateRegistrationInput({ name, email, password })
  if (validationError) {
    return json({ error: validationError }, { status: 400 })
  }

  const normalizedEmail = normalizeEmail(email)
  const existingUser = await getUserByEmail(db, normalizedEmail)
  if (existingUser) {
    return json({ error: '该邮箱已注册' }, { status: 409 })
  }

  const userId = createUserId()
  const salt = createPasswordSalt()
  const passwordHash = await fingerprintPassword(password, salt)
  const createdAt = new Date().toISOString()

  await db
    .prepare(`
      INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(userId, name.trim(), normalizedEmail, passwordHash, salt, createdAt)
    .run()

  const token = await createSessionToken(userId, authSecret)
  const secure = getSecureCookieFlag(context.request)

  return json(
    { user: sanitizeUser({ id: userId, name: name.trim(), email: normalizedEmail, created_at: createdAt }) },
    {
      status: 201,
      headers: {
        'Set-Cookie': buildSessionCookie(token, { secure }),
      },
    },
  )
}

export async function handleLogin(context) {
  const db = context.env.DB
  const authSecret = context.env.AUTH_SECRET

  if (!db || !authSecret) {
    return json({ error: 'DB or AUTH_SECRET is not configured' }, { status: 500 })
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email = '', password = '' } = body ?? {}
  const validationError = validateLoginInput({ email, password })
  if (validationError) {
    return json({ error: validationError }, { status: 400 })
  }

  const normalizedEmail = normalizeEmail(email)
  const user = await getUserByEmail(db, normalizedEmail)
  if (!user) {
    return json({ error: '邮箱或密码错误' }, { status: 401 })
  }

  const passwordHash = await fingerprintPassword(password, user.password_salt)
  if (passwordHash !== user.password_hash) {
    return json({ error: '邮箱或密码错误' }, { status: 401 })
  }

  const token = await createSessionToken(user.id, authSecret)
  const secure = getSecureCookieFlag(context.request)

  return json(
    { user: sanitizeUser(user) },
    {
      status: 200,
      headers: {
        'Set-Cookie': buildSessionCookie(token, { secure }),
      },
    },
  )
}

export async function handleMe(context) {
  const db = context.env.DB
  const authSecret = context.env.AUTH_SECRET

  if (!db || !authSecret) {
    return json({ error: 'DB or AUTH_SECRET is not configured' }, { status: 500 })
  }

  const cookies = parseCookieHeader(context.request.headers.get('Cookie') || '')
  const token = cookies[AUTH_COOKIE_NAME]
  const session = await verifySessionToken(token, authSecret)

  if (!session) {
    return json({ user: null }, { status: 200 })
  }

  const user = await getUserById(db, session.userId)
  if (!user) {
    const secure = getSecureCookieFlag(context.request)
    return json(
      { user: null },
      {
        status: 200,
        headers: {
          'Set-Cookie': buildExpiredSessionCookie({ secure }),
        },
      },
    )
  }

  return json({ user: sanitizeUser(user) }, { status: 200 })
}

export async function handleLogout(context) {
  const secure = getSecureCookieFlag(context.request)
  return json(
    { ok: true },
    {
      status: 200,
      headers: {
        'Set-Cookie': buildExpiredSessionCookie({ secure }),
      },
    },
  )
}
