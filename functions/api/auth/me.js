import { handleMe } from '../../_lib/auth.js'

export async function onRequestGet(context) {
  return handleMe(context)
}
