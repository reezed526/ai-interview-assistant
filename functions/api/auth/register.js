import { handleRegister } from '../../_lib/auth.js'

export async function onRequestPost(context) {
  return handleRegister(context)
}
