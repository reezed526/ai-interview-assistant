import { handleLogin } from '../../_lib/auth.js'

export async function onRequestPost(context) {
  return handleLogin(context)
}
