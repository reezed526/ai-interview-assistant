import { handleMe } from '../_lib/local-auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return handleMe(req, res)
}
