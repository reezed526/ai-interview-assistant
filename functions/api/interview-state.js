import {
  handleDeleteInterviewState,
  handleGetInterviewState,
  handlePutInterviewState,
} from '../_lib/user-data.js'

export async function onRequestGet(context) {
  return handleGetInterviewState(context)
}

export async function onRequestPut(context) {
  return handlePutInterviewState(context)
}

export async function onRequestDelete(context) {
  return handleDeleteInterviewState(context)
}
