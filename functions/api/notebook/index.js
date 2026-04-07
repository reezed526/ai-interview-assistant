import {
  handleClearNotebook,
  handleCreateNotebookEntry,
  handleGetNotebook,
} from '../../_lib/user-data.js'

export async function onRequestGet(context) {
  return handleGetNotebook(context)
}

export async function onRequestPost(context) {
  return handleCreateNotebookEntry(context)
}

export async function onRequestDelete(context) {
  return handleClearNotebook(context)
}
