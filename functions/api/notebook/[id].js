import { handleDeleteNotebookEntry } from '../../_lib/user-data.js'

export async function onRequestDelete(context) {
  return handleDeleteNotebookEntry(context)
}
