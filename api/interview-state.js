import {
  handleDeleteInterviewState,
  handleGetInterviewState,
  handlePutInterviewState,
} from './_lib/local-user-data.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetInterviewState(req, res)
  }

  if (req.method === 'PUT') {
    return handlePutInterviewState(req, res)
  }

  if (req.method === 'DELETE') {
    return handleDeleteInterviewState(req, res)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
