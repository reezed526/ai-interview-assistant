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
  isSecureRequest,
  normalizeUsername,
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

async function getUserByLogin(db, username) {
  return db
    .prepare(`
      SELECT id, name, username, email, password_hash, password_salt, created_at, subscription_plan, interview_quota, interview_used
      FROM users
      WHERE username = ?
    `)
    .bind(username)
    .first()
}

async function getUserById(db, userId) {
  return db
    .prepare(`
      SELECT id, name, username, email, created_at, subscription_plan, interview_quota, interview_used
      FROM users
      WHERE id = ?
    `)
    .bind(userId)
    .first()
}

export async function requireAuthenticatedUser(context) {
  const db = context.env.DB
  const authSecret = context.env.AUTH_SECRET

  if (!db || !authSecret) {
    return { error: json({ error: 'DB or AUTH_SECRET is not configured' }, { status: 500 }) }
  }

  const cookies = parseCookieHeader(context.request.headers.get('Cookie') || '')
  const token = cookies[AUTH_COOKIE_NAME]
  const session = await verifySessionToken(token, authSecret)

  if (!session) {
    return { error: json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await getUserById(db, session.userId)
  if (!user) {
    const secure = getSecureCookieFlag(context.request)
    return {
      error: json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Set-Cookie': buildExpiredSessionCookie({ secure }) },
        },
      ),
    }
  }

  return {
    db,
    user,
  }
}

export async function ensureInterviewQuota(context, interviewId) {
  const auth = await requireAuthenticatedUser(context)
  if (auth.error) return auth

  if (!interviewId) {
    return { error: json({ error: 'interviewId is required' }, { status: 400 }) }
  }

  const existingAttempt = await auth.db
    .prepare('SELECT id FROM interview_attempts WHERE id = ? AND user_id = ?')
    .bind(interviewId, auth.user.id)
    .first()

  if (!existingAttempt) {
    if (hasUnlimitedInterviewAccess(auth.user)) {
      return {
        ...auth,
        usage: sanitizeUser(auth.user),
      }
    }

    const remaining = Number(auth.user.interview_quota) < 0
      ? -1
      : Number(auth.user.interview_quota) - Number(auth.user.interview_used)

    if (remaining <= 0) {
      return {
        error: json(
          {
            error: '免费版面试次数已用完，当前最多可进行 10 次模拟。订阅计划即将上线。',
            code: 'INTERVIEW_QUOTA_EXCEEDED',
            usage: sanitizeUser(auth.user),
          },
          { status: 403 },
        ),
      }
    }

    await auth.db.batch([
      auth.db
        .prepare('UPDATE users SET interview_used = interview_used + 1 WHERE id = ?')
        .bind(auth.user.id),
      auth.db
        .prepare(`
          INSERT INTO interview_attempts (id, user_id, status, created_at, updated_at)
          VALUES (?, ?, 'started', ?, ?)
        `)
        .bind(interviewId, auth.user.id, new Date().toISOString(), new Date().toISOString()),
    ])

    auth.user = await getUserById(auth.db, auth.user.id)
  }

  return {
    ...auth,
    usage: sanitizeUser(auth.user),
  }
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

  const { name = '', username = '', password = '' } = body ?? {}
  const validationError = validateRegistrationInput({ name, username, password })
  if (validationError) {
    return json({ error: validationError }, { status: 400 })
  }

  const normalizedUsername = normalizeUsername(username)
  const existingUser = await getUserByLogin(db, normalizedUsername)
  if (existingUser) {
    return json({ error: '该用户名已注册', code: 'USERNAME_ALREADY_EXISTS' }, { status: 409 })
  }

  const userId = createUserId()
  const salt = createPasswordSalt()
  const passwordHash = await fingerprintPassword(password, salt)
  const createdAt = new Date().toISOString()

  await db
    .prepare(`
      INSERT INTO users (
        id, name, username, email, password_hash, password_salt, created_at,
        subscription_plan, interview_quota, interview_used
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      userId,
      name.trim(),
      normalizedUsername,
      null,
      passwordHash,
      salt,
      createdAt,
      FREE_PLAN_CODE,
      FREE_INTERVIEW_QUOTA,
      0,
    )
    .run()

  const token = await createSessionToken(userId, authSecret)
  const secure = getSecureCookieFlag(context.request)

  return json(
    {
      user: sanitizeUser({
        id: userId,
        name: name.trim(),
        username: normalizedUsername,
        email: null,
        created_at: createdAt,
        subscription_plan: FREE_PLAN_CODE,
        interview_quota: FREE_INTERVIEW_QUOTA,
        interview_used: 0,
      }),
    },
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

  const { username = '', password = '' } = body ?? {}
  const validationError = validateLoginInput({ username, password })
  if (validationError) {
    return json({ error: validationError }, { status: 400 })
  }

  const normalizedUsername = normalizeUsername(username)
  const user = await getUserByLogin(db, normalizedUsername)
  if (!user) {
    return json({ error: '该用户名还没有注册', code: 'USER_NOT_FOUND' }, { status: 404 })
  }

  const passwordHash = await fingerprintPassword(password, user.password_salt)
  if (passwordHash !== user.password_hash) {
    return json({ error: '用户名或密码错误', code: 'INVALID_PASSWORD' }, { status: 401 })
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
  const auth = await requireAuthenticatedUser(context)
  if (auth.error) {
    if (auth.error.status === 401) {
      return json({ user: null }, { status: 200 })
    }
    return auth.error
  }

  return json({ user: sanitizeUser(auth.user) }, { status: 200 })
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
