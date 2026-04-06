import { handleLogout } from '../../_lib/auth.js'

export async function onRequestPost(context) {
  return handleLogout(context)
}
