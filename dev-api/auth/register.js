import { handleRegister } from '../_lib/local-auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return handleRegister(req, res)
}
