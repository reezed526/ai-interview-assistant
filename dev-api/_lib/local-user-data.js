import fs from 'node:fs/promises'
import path from 'node:path'
import { AUTH_COOKIE_NAME, parseCookieHeader, verifySessionToken } from '../../shared/auth.js'

const DATA_DIR = path.resolve(process.cwd(), '.data')
const NOTEBOOK_FILE = path.join(DATA_DIR, 'notebook.json')
const INTERVIEW_STATE_FILE = path.join(DATA_DIR, 'interview-state.json')
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-auth-secret-change-me'

async function ensureFile(filePath, fallback = '{}') {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(filePath)
  } catch {
    await fs.writeFile(filePath, fallback, 'utf8')
  }
}

async function readJson(filePath, fallback = {}) {
  await ensureFile(filePath, JSON.stringify(fallback))
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function writeJson(filePath, data) {
  await ensureFile(filePath, JSON.stringify({}))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function json(res, status, data) {
  return res.status(status).json(data)
}

async function requireUser(req, res) {
  const cookies = parseCookieHeader(req.headers.cookie || '')
  const token = cookies[AUTH_COOKIE_NAME]
  const session = await verifySessionToken(token, AUTH_SECRET)

  if (!session) {
    json(res, 401, { error: 'Unauthorized' })
    return null
  }

  return session.userId
}

export async function handleGetNotebook(req, res) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const all = await readJson(NOTEBOOK_FILE, {})
  return json(res, 200, { entries: all[userId] ?? [] })
}

export async function handleCreateNotebookEntry(req, res) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const {
    jobType = '',
    question = '',
    userAnswer = '',
    feedback = '',
    betterDirection = '',
    score = 0,
  } = req.body ?? {}

  if (!question.trim()) {
    return json(res, 400, { error: 'question is required' })
  }

  const entry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    jobType,
    question,
    userAnswer,
    feedback,
    betterDirection,
    score: Number(score) || 0,
    date: new Date().toISOString(),
  }

  const all = await readJson(NOTEBOOK_FILE, {})
  all[userId] = [entry, ...(all[userId] ?? [])]
  await writeJson(NOTEBOOK_FILE, all)
  return json(res, 201, { entry })
}

export async function handleDeleteNotebookEntry(req, res, entryId) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const all = await readJson(NOTEBOOK_FILE, {})
  all[userId] = (all[userId] ?? []).filter((item) => item.id !== entryId)
  await writeJson(NOTEBOOK_FILE, all)
  return json(res, 200, { ok: true })
}

export async function handleClearNotebook(req, res) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const all = await readJson(NOTEBOOK_FILE, {})
  all[userId] = []
  await writeJson(NOTEBOOK_FILE, all)
  return json(res, 200, { ok: true })
}

export async function handleGetInterviewState(req, res) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const all = await readJson(INTERVIEW_STATE_FILE, {})
  return json(res, 200, { state: all[userId] ?? null })
}

export async function handlePutInterviewState(req, res) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const all = await readJson(INTERVIEW_STATE_FILE, {})
  all[userId] = req.body?.state ?? null
  await writeJson(INTERVIEW_STATE_FILE, all)
  return json(res, 200, { ok: true })
}

export async function handleDeleteInterviewState(req, res) {
  const userId = await requireUser(req, res)
  if (!userId) return

  const all = await readJson(INTERVIEW_STATE_FILE, {})
  delete all[userId]
  await writeJson(INTERVIEW_STATE_FILE, all)
  return json(res, 200, { ok: true })
}
