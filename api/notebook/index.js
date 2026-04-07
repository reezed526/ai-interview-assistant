import {
  handleClearNotebook,
  handleCreateNotebookEntry,
  handleGetNotebook,
} from '../_lib/local-user-data.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetNotebook(req, res)
  }

  if (req.method === 'POST') {
    return handleCreateNotebookEntry(req, res)
  }

  if (req.method === 'DELETE') {
    return handleClearNotebook(req, res)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
