import { handleDeleteNotebookEntry } from '../_lib/local-user-data.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const entryId = req.query?.id || req.url?.split('/').pop()
  return handleDeleteNotebookEntry(req, res, entryId)
}
