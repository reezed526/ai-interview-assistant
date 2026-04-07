import { AUTH_COOKIE_NAME, parseCookieHeader, verifySessionToken } from '../../shared/auth.js'

function json(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  })
}

async function requireUser(context) {
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

  return {
    db,
    userId: session.userId,
  }
}

export async function handleGetNotebook(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  const result = await auth.db
    .prepare(`
      SELECT id, job_type, question, user_answer, feedback, better_direction, score, created_at
      FROM notebook_entries
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `)
    .bind(auth.userId)
    .all()

  const entries = (result.results || []).map((item) => ({
    id: item.id,
    jobType: item.job_type,
    question: item.question,
    userAnswer: item.user_answer,
    feedback: item.feedback,
    betterDirection: item.better_direction,
    score: item.score,
    date: item.created_at,
  }))

  return json({ entries }, { status: 200 })
}

export async function handleCreateNotebookEntry(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    jobType = '',
    question = '',
    userAnswer = '',
    feedback = '',
    betterDirection = '',
    score = 0,
  } = body ?? {}

  if (!question.trim()) {
    return json({ error: 'question is required' }, { status: 400 })
  }

  const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const createdAt = new Date().toISOString()

  await auth.db
    .prepare(`
      INSERT INTO notebook_entries (
        id, user_id, job_type, question, user_answer, feedback, better_direction, score, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      auth.userId,
      jobType,
      question,
      userAnswer,
      feedback,
      betterDirection,
      Number(score) || 0,
      createdAt,
    )
    .run()

  return json({
    entry: {
      id,
      jobType,
      question,
      userAnswer,
      feedback,
      betterDirection,
      score: Number(score) || 0,
      date: createdAt,
    },
  }, { status: 201 })
}

export async function handleDeleteNotebookEntry(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  const entryId = context.params.id
  if (!entryId) {
    return json({ error: 'Entry id is required' }, { status: 400 })
  }

  await auth.db
    .prepare('DELETE FROM notebook_entries WHERE id = ? AND user_id = ?')
    .bind(entryId, auth.userId)
    .run()

  return json({ ok: true }, { status: 200 })
}

export async function handleClearNotebook(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  await auth.db
    .prepare('DELETE FROM notebook_entries WHERE user_id = ?')
    .bind(auth.userId)
    .run()

  return json({ ok: true }, { status: 200 })
}

export async function handleGetInterviewState(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  const row = await auth.db
    .prepare(`
      SELECT payload_json, updated_at
      FROM interview_states
      WHERE user_id = ?
    `)
    .bind(auth.userId)
    .first()

  if (!row?.payload_json) {
    return json({ state: null }, { status: 200 })
  }

  let state = null
  try {
    state = JSON.parse(row.payload_json)
  } catch {
    state = null
  }

  return json({ state, updatedAt: row.updated_at }, { status: 200 })
}

export async function handlePutInterviewState(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { state = null } = body ?? {}
  const updatedAt = new Date().toISOString()
  const payloadJson = JSON.stringify(state)

  await auth.db
    .prepare(`
      INSERT INTO interview_states (user_id, payload_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `)
    .bind(auth.userId, payloadJson, updatedAt)
    .run()

  return json({ ok: true, updatedAt }, { status: 200 })
}

export async function handleDeleteInterviewState(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth.error

  await auth.db
    .prepare('DELETE FROM interview_states WHERE user_id = ?')
    .bind(auth.userId)
    .run()

  return json({ ok: true }, { status: 200 })
}
