async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }

  return data
}

export async function fetchNotebookEntries() {
  return request('/api/notebook', { method: 'GET' })
}

export async function createNotebookEntry(payload) {
  return request('/api/notebook', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteNotebookEntry(id) {
  return request(`/api/notebook/${id}`, { method: 'DELETE' })
}

export async function clearNotebookEntries() {
  return request('/api/notebook', { method: 'DELETE' })
}

export async function fetchInterviewState() {
  return request('/api/interview-state', { method: 'GET' })
}

export async function saveInterviewState(state) {
  return request('/api/interview-state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  })
}

export async function clearInterviewState() {
  return request('/api/interview-state', { method: 'DELETE' })
}
