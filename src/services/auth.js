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
    const error = new Error(data.error || `HTTP ${response.status}`)
    error.code = data.code
    throw error
  }

  return data
}

export async function registerUser(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchCurrentUser() {
  return request('/api/auth/me', {
    method: 'GET',
  })
}

export async function logoutUser() {
  return request('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
